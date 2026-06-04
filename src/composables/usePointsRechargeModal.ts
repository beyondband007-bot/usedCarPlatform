import { ref } from "vue";

const rechargeModalVisible = ref(false);
const rechargeSuccessTick = ref(0);

export function usePointsRechargeModal() {
  function openRechargeModal() {
    rechargeModalVisible.value = true;
  }

  function closeRechargeModal() {
    rechargeModalVisible.value = false;
  }

  function notifyRechargeSuccess() {
    rechargeSuccessTick.value += 1;
  }

  return {
    rechargeModalVisible,
    rechargeSuccessTick,
    openRechargeModal,
    closeRechargeModal,
    notifyRechargeSuccess,
  };
}
