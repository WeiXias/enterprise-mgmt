// ---- 产品 ----
export type ProductStatus = 'on_sale' | 'off_shelf'

export interface Product {
  id: string
  name: string
  code: string
  standardPrice: number
  costPrice?: number
  description?: string
  categoryId?: string
  category?: ProductCategory | null
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export interface ProductListItem extends Product {
  quoteCount: number
  contractCount: number
}

export interface CreateProductPayload {
  name: string
  code: string
  categoryId?: string
  standardPrice: number
  costPrice?: number
  description?: string
}

export interface ProductCategory {
  id: string
  name: string
  parentId?: string
  productCount: number
  children?: ProductCategory[]
}

export interface CreateCategoryPayload {
  name: string
  parentId?: string
  sort?: number
}

