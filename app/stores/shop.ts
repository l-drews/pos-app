import { useQuery, useQueryCache } from "@pinia/colada";

export const useShopStore = defineStore("shop", () => {
  const orpc = useOrpc();
  const queryCache = useQueryCache();

  // State — the scanner selects by barcode (the user list may not be loaded
  // yet at scan time), the combobox selects a concrete user by uuid.
  const userBarcode = ref<string>("");
  const selectedUserUuid = ref<string | null>(null);
  const searchString = ref("");

  // Cart data via oRPC query
  const { data: cartItems, refresh: refreshCart } = useQuery(
    orpc.cart.getAll.queryOptions(),
  );

  // All users for search
  const { data: allUsers } = useQuery(orpc.users.getAll.queryOptions());

  // All products for the scanner-less product search
  const { data: allProducts } = useQuery(orpc.products.getAll.queryOptions());

  // All orders for today's total calculation
  const { data: allOrders } = useQuery(orpc.orders.getAll.queryOptions());

  // Mutations
  const addCartMutation = useToastMutation({
    ...orpc.cart.addItem.mutationOptions(),
    onSettled: () => queryCache.invalidateQueries({ key: orpc.cart.key() }),
  });

  const updateCartMutation = useToastMutation({
    ...orpc.cart.update.mutationOptions(),
    onSettled: () => queryCache.invalidateQueries({ key: orpc.cart.key() }),
  });

  const deleteCartMutation = useToastMutation({
    ...orpc.cart.delete.mutationOptions(),
    onSettled: () => queryCache.invalidateQueries({ key: orpc.cart.key() }),
  });

  const createOrderMutation = useToastMutation({
    ...orpc.orders.create.mutationOptions(),
    onSettled: () => {
      queryCache.invalidateQueries({ key: orpc.cart.key() });
      queryCache.invalidateQueries({ key: orpc.orders.key() });
      queryCache.invalidateQueries({ key: orpc.users.key() });
    },
  });

  // Computed
  const currentUser = computed(() => {
    if (!allUsers.value) return null;
    if (selectedUserUuid.value) {
      return (
        allUsers.value.find((u: any) => u.uuid === selectedUserUuid.value) ??
        null
      );
    }
    if (!userBarcode.value) return null;
    return allUsers.value.find((u: any) => u.barcode === userBarcode.value) ?? null;
  });

  const filteredUsers = computed(() => {
    if (!allUsers.value) return [];
    const q = searchString.value.toLowerCase();
    return allUsers.value.filter((u: any) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
    );
  });

  const paymentTotal = computed(() => {
    if (!cartItems.value) return 0;
    return cartItems.value.reduce(
      (sum: number, item: any) => sum + (item.product?.price ?? 0) * item.count,
      0,
    );
  });

  const todaysOrderTotal = computed(() => {
    if (!allOrders.value || !currentUser.value) return 0;
    const today = new Date().toDateString();
    return allOrders.value
      .filter(
        (o: any) =>
          o.userUuid === currentUser.value!.uuid &&
          new Date(o.createdAt).toDateString() === today,
      )
      .reduce((sum: number, o: any) => sum + (o.amount ?? 0), 0);
  });

  const disablePayment = computed(
    () =>
      !currentUser.value ||
      !cartItems.value?.length ||
      createOrderMutation.isLoading.value,
  );

  // Actions
  function addCartItem(barcode: string) {
    addCartMutation.mutate({ barcode });
  }

  function addCartItemByUuid(productUuid: string) {
    addCartMutation.mutate({ productUuid });
  }

  function incrementCount(item: any) {
    updateCartMutation.mutate({ uuid: item.uuid, count: item.count + 1 });
  }

  function decrementCount(item: any) {
    if (item.count <= 1) {
      deleteCartMutation.mutate({ uuid: item.uuid });
    } else {
      updateCartMutation.mutate({ uuid: item.uuid, count: item.count - 1 });
    }
  }

  function deleteItem(item: any) {
    deleteCartMutation.mutate({ uuid: item.uuid });
  }

  async function createOrder() {
    if (!currentUser.value) return;
    // Snapshot the selection: the next customer may already be selected by
    // the time the order request settles, and must not be deselected then.
    const orderedUuid = currentUser.value.uuid;
    try {
      await createOrderMutation.mutateAsync({ userUuid: orderedUuid });
    } catch {
      // Feedback is handled by the mutation's error toast; keep the selection
      // so the cashier can retry.
      return;
    }
    if (currentUser.value?.uuid === orderedUuid) {
      userBarcode.value = "";
      selectedUserUuid.value = null;
      searchString.value = "";
    }
  }

  function selectUser(barcode: string) {
    userBarcode.value = barcode;
    selectedUserUuid.value = null;
  }

  function selectUserByUuid(uuid: string) {
    selectedUserUuid.value = uuid;
    userBarcode.value = "";
  }

  return {
    userBarcode,
    searchString,
    cartItems,
    allUsers,
    allProducts,
    currentUser,
    filteredUsers,
    paymentTotal,
    todaysOrderTotal,
    disablePayment,
    addCartItem,
    addCartItemByUuid,
    incrementCount,
    decrementCount,
    deleteItem,
    createOrder,
    selectUser,
    selectUserByUuid,
    refreshCart,
  };
});
