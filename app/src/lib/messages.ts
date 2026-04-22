export const messages = {
  auth: {
    unauthorized: '未登入，請先登入',
    forbidden: '權限不足',
  },
  course: {
    notFound: '課程不存在',
    categoryNotFound: '課程類別不存在',
    invalidStatusTransition: (from: string, to: string) => `無法從 ${from} 轉換至 ${to}`,
    createSuccess: '課程建立成功',
    updateSuccess: '課程更新成功',
  },
  session: {
    notFound: '梯次不存在',
    alreadyCancelled: '梯次已取消',
    cannotEditCancelled: '已取消的梯次無法編輯',
    cancelSuccess: '梯次已取消，相關申請已退回',
  },
  category: {
    duplicateName: '類別名稱已存在',
    createSuccess: '類別建立成功',
  },
} as const
