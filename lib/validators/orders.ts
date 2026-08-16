import { z } from 'zod/v4';

export const clothingTypeEnum = z.enum([
  'shirt',
  'pants',
  'underwear',
  'socks',
  'bedsheet',
  'towel',
  'jacket',
  'delicate',
  'other',
]);

export const fabricTypeEnum = z.enum([
  'cotton',
  'polyester',
  'silk',
  'wool',
  'linen',
  'denim',
  'synthetic_blend',
  'unknown',
]);

export const colorCategoryEnum = z.enum([
  'white',
  'light',
  'dark',
  'colored',
  'mixed',
]);

export const paymentMethodEnum = z.enum(['online', 'cash']);

export const orderItemInputSchema = z.object({
  clothing_type: clothingTypeEnum,
  fabric_type: fabricTypeEnum,
  color_category: colorCategoryEnum,
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  has_stains: z.boolean().default(false),
  stain_description: z.string().nullish(),
});

export const createOrderSchema = z.object({
  branch_id: z.string().min(1, 'Branch ID is required'),
  pickup_address: z.string().min(1, 'Pickup address is required'),
  pickup_latitude: z.number().min(-90).max(90),
  pickup_longitude: z.number().min(-180).max(180),
  delivery_address: z.string().min(1, 'Delivery address is required'),
  delivery_latitude: z.number().min(-90).max(90),
  delivery_longitude: z.number().min(-180).max(180),
  pickup_scheduled_at: z.string().nullish(),
  special_instructions: z.string().max(500).nullish(),
  payment_method: paymentMethodEnum.default('online'),
  items: z.array(orderItemInputSchema).optional().default([]),
});

export const staffIntakeSchema = z.object({
  weight_kg: z.number().positive('Weight must be greater than 0 kg'),
  notes: z.string().max(500).nullish(),
  clothing_types: z.array(clothingTypeEnum).optional().default(['shirt']),
  fabric_types: z.array(fabricTypeEnum).optional().default(['cotton']),
  color_categories: z.array(colorCategoryEnum).optional().default(['mixed']),
  has_stains: z.boolean().default(false),
  stain_description: z.string().nullish(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'rider_assigned',
    'pickup_en_route',
    'picked_up',
    'at_facility',
    'washing',
    'drying',
    'folding',
    'ready_for_delivery',
    'delivery_en_route',
    'delivered',
    'completed',
    'cancelled',
  ]),
  note: z.string().max(250).optional().nullable(),
  weight_kg: z.number().positive().optional().nullable(),
  cash_collected: z.boolean().optional(),
  delivery_proof_url: z.string().optional().nullable(),
  intake: staffIntakeSchema.optional().nullable(),
});

export const assignRiderSchema = z.object({
  rider_id: z.string().min(1, 'Rider ID is required'),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type StaffIntakeInput = z.infer<typeof staffIntakeSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AssignRiderInput = z.infer<typeof assignRiderSchema>;
