interface ApiResponse<T = any> {
  code: number
  message: string
  data: T | null
}

export function success<T>(data: T, message = '搞定了！'): ApiResponse<T> {
  return { code: 0, message, data }
}

export function fail(message: string, code = -1): ApiResponse<null> {
  return { code, message, data: null }
}

export function paginate<T>(list: T[], total: number, page: number, pageSize: number) {
  return success({
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  })
}
