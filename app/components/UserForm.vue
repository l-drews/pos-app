<script setup lang="ts">
import { useQuery } from "@pinia/colada";

interface User {
  uuid?: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  groupUuid: string | null;
  roleUuid: string | null;
  generateBarcode: boolean;
  barcode?: string | null;
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
const { data: roles } = useQuery(orpc.roles.getAll.queryOptions({ enabled: active }));

const user = ref<User>({
  firstName: "",
  lastName: "",
  birthDate: null,
  groupUuid: null,
  roleUuid: null,
  generateBarcode: true,
});

const date = ref<Date | null>(null);
const image = ref<File | null>(null);
const preview = ref<string | null>(null);

watch(active, (val) => {
  if (val) {
    image.value = null;
    preview.value = null;
    if (props.selected) {
      user.value = {
        firstName: props.selected.firstName,
        lastName: props.selected.lastName,
        birthDate: props.selected.birthDate,
        groupUuid: props.selected.groupUuid,
        roleUuid: props.selected.roleUuid,
        generateBarcode: false,
        barcode: props.selected.barcode,
      };
      date.value = props.selected.birthDate
        ? new Date(props.selected.birthDate)
        : null;
    } else {
      user.value = {
        firstName: "",
        lastName: "",
        birthDate: null,
        groupUuid: null,
        roleUuid: null,
        generateBarcode: true,
      };
      date.value = null;
    }
  }
});

watch(date, (val) => {
  if (val) {
    const d = new Date(val.getTime() - val.getTimezoneOffset() * 60000);
    user.value.birthDate = d.toISOString().split("T")[0];
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
    preview.value = null;
  }
});

const defaultImageUrl = "/images/default-avatar.png";

function onCancel() {
  active.value = false;
  emit("on-cancel");
}

function onConfirm() {
  const result = { ...user.value };
  result.generateBarcode = result.barcode == null;
  delete result.barcode;
  result.uuid = props.selected?.uuid;
  active.value = false;
  emit("on-confirm", result);
}
</script>

<template>
  <o-modal v-model:active="active" scroll="clip" :can-cancel="false">
    <div class="p-4">
      <div class="pb-4">
        <h5>{{ title }}</h5>
      </div>
      <div>
        <div class="flex flex-row items-center justify-evenly">
          <img
            class="h-32 aspect-square object-cover rounded-full border border-inherit drop-shadow"
            :src="preview ?? defaultImageUrl"
          />
          <o-upload v-model="image" accept="image/*">
            <o-button tag="a" variant="primary" icon-left="image">
              Select image
            </o-button>
          </o-upload>
        </div>
        <o-field grouped label="Name">
          <o-input v-model="user.firstName" placeholder="First Name" expanded />
          <o-input v-model="user.lastName" placeholder="Last Name" expanded />
        </o-field>
        <o-field grouped label="Select a date">
          <o-datepicker
            v-model="date"
            locale="en-CA"
            placeholder="Click to select..."
            icon="calendar"
            trap-focus
          />
        </o-field>
        <o-field grouped label="Barcode">
          <o-field>
            <o-switch v-model="user.generateBarcode" :disabled="!!user.barcode">
              <p v-if="user.barcode">User already has a barcode</p>
            </o-switch>
          </o-field>
        </o-field>
        <o-field label="Group">
          <o-select v-model="user.groupUuid" placeholder="Select a group">
            <option v-for="g in groups" :key="g.uuid" :value="g.uuid">
              {{ g.name }}
            </option>
          </o-select>
        </o-field>
        <o-field label="Role">
          <o-select v-model="user.roleUuid" placeholder="Select a role">
            <option v-for="r in roles" :key="r.uuid" :value="r.uuid">
              {{ r.name }}
            </option>
          </o-select>
        </o-field>
      </div>
      <div class="flex flex-row justify-end gap-x-2">
        <o-button @click="onCancel()">{{ cancelText ?? "Cancel" }}</o-button>
        <o-button @click="onConfirm()">{{ confirmText ?? "Save" }}</o-button>
      </div>
    </div>
  </o-modal>
</template>
