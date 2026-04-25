import { useQuery, useMutation, useQueryCache } from "@pinia/colada";

export const useShopStore = defineStore("shop", () => {
  const orpc = useOrpc();
  const queryCache = useQueryCache();

  // State
  const userBarcode = ref<string>("");
  const searchString = ref("");

  // Cart data via oRPC query
  const { data: cartItems, refresh: refreshCart } = useQuery(
    orpc.cart.getAll.queryOptions(),
  );

  // All users for search
  const { data: allUsers } = useQuery(orpc.users.getAll.queryOptions());

  // All orders for today's total calculation
  const { data: allOrders } = useQuery(orpc.orders.getAll.queryOptions());

  // Mutations
  const addCartMutation = useMutation({
    ...orpc.cart.addItem.mutationOptions(),
    onSettled: () => queryCache.invalidateQueries({ key: orpc.cart.key() }),
  });

  const updateCartMutation = useMutation({
    ...orpc.cart.update.mutationOptions(),
    onSettled: () => queryCache.invalidateQueries({ key: orpc.cart.key() }),
  });

  const deleteCartMutation = useMutation({
    ...orpc.cart.delete.mutationOptions(),
    onSettled: () => queryCache.invalidateQueries({ key: orpc.cart.key() }),
  });

  const createOrderMutation = useMutation({
    ...orpc.orders.create.mutationOptions(),
    onSettled: () => {
      queryCache.invalidateQueries({ key: orpc.cart.key() });
      queryCache.invalidateQueries({ key: orpc.orders.key() });
      queryCache.invalidateQueries({ key: orpc.users.key() });
    },
  });

  // Computed
  const currentUser = computed(() => {
    if (!userBarcode.value || !allUsers.value) return null;
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
    () => !currentUser.value || !cartItems.value?.length,
  );

  // Actions
  function addCartItem(barcode: string) {
    addCartMutation.mutate({ barcode });
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
    await createOrderMutation.mutateAsync({ userUuid: currentUser.value.uuid });
    userBarcode.value = "";
    searchString.value = "";
  }

  function selectUser(barcode: string) {
    userBarcode.value = barcode;
  }

  return {
    userBarcode,
    searchString,
    cartItems,
    allUsers,
    currentUser,
    filteredUsers,
    paymentTotal,
    todaysOrderTotal,
    disablePayment,
    addCartItem,
    incrementCount,
    decrementCount,
    deleteItem,
    createOrder,
    selectUser,
    refreshCart,
  };
});
