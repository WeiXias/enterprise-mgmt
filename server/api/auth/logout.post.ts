import { requireAuth } from '../../utils/permission'
import { success } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return success({ message: '已登出' }, '已登出，下次见！')
})
