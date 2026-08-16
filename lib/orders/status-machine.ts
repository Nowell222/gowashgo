import type { OrderStatus, UserRole } from '@/lib/types';

/**
 * Order Status Machine — defines valid transitions.
 * Each key maps to the set of statuses it can transition TO.
 */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['rider_assigned', 'cancelled'],
  rider_assigned: ['pickup_en_route', 'cancelled'],
  pickup_en_route: ['picked_up', 'cancelled'],
  picked_up: ['at_facility', 'cancelled'],
  at_facility: ['washing', 'cancelled'],
  washing: ['drying', 'cancelled'],
  drying: ['folding', 'cancelled'],
  folding: ['ready_for_delivery', 'cancelled'],
  ready_for_delivery: ['delivery_en_route', 'cancelled'],
  delivery_en_route: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

/**
 * Which roles can trigger which transitions.
 * Multiple roles may trigger the same transition.
 */
const TRANSITION_PERMISSIONS: Record<string, UserRole[]> = {
  'pending->confirmed': ['staff', 'branch_manager'],
  'pending->cancelled': ['customer', 'staff', 'branch_manager'],
  'confirmed->rider_assigned': ['staff', 'branch_manager'],
  'confirmed->cancelled': ['customer', 'staff', 'branch_manager'],
  'rider_assigned->pickup_en_route': ['rider'],
  'rider_assigned->cancelled': ['staff', 'branch_manager'],
  'pickup_en_route->picked_up': ['rider'],
  'pickup_en_route->cancelled': ['staff', 'branch_manager'],
  'picked_up->at_facility': ['rider', 'staff', 'branch_manager'],
  'picked_up->cancelled': ['staff', 'branch_manager'],
  'at_facility->washing': ['staff', 'branch_manager'],
  'at_facility->cancelled': ['staff', 'branch_manager'],
  'washing->drying': ['staff', 'branch_manager'],
  'washing->cancelled': ['staff', 'branch_manager'],
  'drying->folding': ['staff', 'branch_manager'],
  'drying->cancelled': ['staff', 'branch_manager'],
  'folding->ready_for_delivery': ['staff', 'branch_manager'],
  'folding->cancelled': ['staff', 'branch_manager'],
  'ready_for_delivery->delivery_en_route': ['rider'],
  'ready_for_delivery->cancelled': ['staff', 'branch_manager'],
  'delivery_en_route->delivered': ['rider'],
  'delivered->completed': ['staff', 'branch_manager', 'platform_admin'],
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a role can perform a specific status transition.
 */
export function canPerformTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: UserRole
): boolean {
  if (!isValidTransition(from, to)) return false;
  const key = `${from}->${to}`;
  const allowedRoles = TRANSITION_PERMISSIONS[key];
  if (!allowedRoles) return false;
  // Platform admin can always perform any valid transition
  if (role === 'platform_admin') return true;
  return allowedRoles.includes(role);
}

/**
 * Get the list of valid next statuses for an order, given the user's role.
 */
export function getNextStatuses(currentStatus: OrderStatus, role: UserRole): OrderStatus[] {
  const possible = STATUS_TRANSITIONS[currentStatus] || [];
  return possible.filter((next) => canPerformTransition(currentStatus, next, role));
}

/**
 * Human-readable status label.
 */
export function formatOrderStatus(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    rider_assigned: 'Rider Assigned',
    pickup_en_route: 'Pickup En Route',
    picked_up: 'Picked Up',
    at_facility: 'At Facility',
    washing: 'Washing',
    drying: 'Drying',
    folding: 'Folding',
    ready_for_delivery: 'Ready for Delivery',
    delivery_en_route: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Status color for UI badges.
 */
export function getOrderStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'pending':
      return 'neutral';
    case 'ready_for_delivery':
    case 'delivery_en_route':
      return 'warning';
    default:
      return 'info';
  }
}
