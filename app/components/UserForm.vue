<script setup lang="ts">
import { useQuery } from "@pinia/colada";
import { ImagePlus } from "lucide-vue-next";
import { z } from "zod";

interface User {
  uuid?: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  groupUuid: string | null;
  generateBarcode: boolean;
  barcode?: string | null;
  image?: File;
}

const props = defineProps<{
  title: string;
  confirmText?: string;
  cancelText?: string;
  selected?: (User & Record<string, any>) | null;
}>();

const active = defineModel<boolean>("active", { default: false });
const emit = defineEmits<{
  "on-confirm": [user: User];
  "on-cancel": [];
}>();

const orpc = useOrpc();

const { data: groups } = useQuery(orpc.groups.getAll.queryOptions({ enabled: active }));

// Error messages are translation keys, resolved via $t at display time so
// they follow locale switches.
const userSchema = z.object({
  firstName: z.string().trim().min(1, "validation.firstNameRequired"),
  lastName: z.string().trim().min(1, "validation.lastNameRequired"),
  birthDate: z.string().min(1, "validation.birthDateRequired"),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof userSchema>, string>>;

// Internal state keeps barcode as a plain string for the input binding;
// onConfirm converts "" to null (clear) or drops it (generate).
const user = ref<Omit<User, "barcode"> & { barcode: string }>({
  firstName: "",
  lastName: "",
  birthDate: null,
  groupUuid: null,
  generateBarcode: true,
  barcode: "",
});

const errors = ref<FieldErrors>({});

// Sentinel for "no group" — reka-ui's Select needs a concrete item value,
// and clearing the selection must reach the server as groupUuid: null.
const NO_GROUP = "none";
const selectedGroup = computed({
  get: () => user.value.groupUuid ?? NO_GROUP,
  set: (value: string) => {
    user.value.groupUuid = value === NO_GROUP ? null : value;
  },
});

const image = ref<File | null>(null);
const preview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

watch(active, (val) => {
  if (val) {
    image.value = null;
    // Pre-fill with the user's current image; a newly picked file replaces it.
    preview.value = (props.selected as any)?.imageUrl ?? null;
    errors.value = {};
    if (props.selected) {
      user.value = {
        firstName: props.selected.firstName,
        lastName: props.selected.lastName,
        birthDate: props.selected.birthDate,
        groupUuid: props.selected.groupUuid,
        generateBarcode: false,
        barcode: props.selected.barcode ?? "",
      };
    } else {
      user.value = {
        firstName: "",
        lastName: "",
        birthDate: null,
        groupUuid: null,
        generateBarcode: true,
        barcode: "",
      };
    }
  }
});

watch(image, (val) => {
  if (val) {
    try {
      preview.value = URL.createObjectURL(val);
    } catch {
      preview.value = null;
    }
  } else {
    preview.value = (props.selected as any)?.imageUrl ?? null;
  }
});

function onFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) image.value = files[0] ?? null;
}

function onCancel() {
  active.value = false;
  emit("on-cancel");
}

function onConfirm() {
  const result = validate(userSchema, {
    firstName: user.value.firstName,
    lastName: user.value.lastName,
    birthDate: user.value.birthDate ?? "",
  });
  if (!result.success) {
    errors.value = result.errors;
    return;
  }
  errors.value = {};

  const payload: User = { ...user.value };
  // With the generate switch on the server assigns the barcode, so the field
  // must be absent; otherwise the typed value is sent ("" clears it to null).
  if (payload.generateBarcode) {
    delete payload.barcode;
  } else {
    payload.barcode = payload.barcode?.trim() || null;
  }
  payload.uuid = props.selected?.uuid;
  // Only send an image when a new file was picked; omitting the field keeps
  // the user's existing image.
  if (image.value) payload.image = image.value;
  // The create schema rejects null (z.uuid().optional()), so omit the field
  // there; the update schema accepts null and uses it to clear the group.
  if (payload.groupUuid == null && !props.selected) {
    delete (payload as Partial<User>).groupUuid;
  }
  active.value = false;
  emit("on-confirm", payload);
}
</script>

<template>
  <Dialog :open="active" @update:open="active = $event">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="flex items-center justify-evenly">
          <UserAvatar class="size-24" :src="preview" />
          <div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileSelect"
            />
            <Button variant="outline" @click="fileInput?.click()">
              <ImagePlus class="mr-2 size-4" />
              {{ $t("users.selectImage") }}
            </Button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="user-first-name">{{ $t("users.firstName") }}</Label>
            <Input id="user-first-name" v-model="user.firstName" :placeholder="$t('users.firstName')" />
            <p v-if="errors.firstName" class="text-sm text-destructive">
              {{ $t(errors.firstName) }}
            </p>
          </div>
          <div class="grid gap-2">
            <Label for="user-last-name">{{ $t("users.lastName") }}</Label>
            <Input id="user-last-name" v-model="user.lastName" :placeholder="$t('users.lastName')" />
            <p v-if="errors.lastName" class="text-sm text-destructive">
              {{ $t(errors.lastName) }}
            </p>
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="user-birthdate">{{ $t("users.dateOfBirth") }}</Label>
          <Input
            id="user-birthdate"
            :model-value="user.birthDate ?? ''"
            type="date"
            @update:model-value="user.birthDate = ($event as string) || null"
          />
          <p v-if="errors.birthDate" class="text-sm text-destructive">
            {{ $t(errors.birthDate) }}
          </p>
        </div>
        <div class="grid gap-2">
          <Label for="user-barcode">{{ $t("common.barcode") }}</Label>
          <Input
            id="user-barcode"
            v-model="user.barcode"
            :disabled="user.generateBarcode"
            :placeholder="$t('common.barcode')"
          />
          <div class="flex items-center gap-2">
            <Switch
              :model-value="user.generateBarcode"
              @update:model-value="user.generateBarcode = $event"
            />
            <Label>
              {{ selected ? $t("users.generateNewBarcode") : $t("users.generateBarcode") }}
            </Label>
          </div>
        </div>
        <div class="grid gap-2">
          <Label>{{ $t("common.group") }}</Label>
          <Select v-model="selectedGroup">
            <SelectTrigger>
              <SelectValue :placeholder="$t('users.selectGroup')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NO_GROUP">{{ $t("users.noGroup") }}</SelectItem>
              <SelectItem v-for="g in groups" :key="g.uuid" :value="g.uuid">
                {{ g.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onCancel()">{{ cancelText ?? $t("common.cancel") }}</Button>
        <Button @click="onConfirm()">{{ confirmText ?? $t("common.save") }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
