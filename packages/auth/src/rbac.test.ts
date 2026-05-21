import { describe, it, expect } from "vitest"

import { UserRole } from "@workspace/types"

import {
  hasMinimumRole,
  getIdleMinutesForRole,
  isWarehouseRole,
  isSuperAdmin,
  isAdminOrAbove,
  isManagerOrAbove,
} from "./rbac"

// Tests for the auth package's RBAC helpers. These are pure functions —
// no I/O, no mocks needed. Their correctness is the foundation of every
// dashboard role-gate, so they're worth a thorough test floor.
//
// The OPERATOR role bug (#97) — where a policy referenced a role that
// didn't exist in the CHECK list — is exactly the class of mistake a
// test floor here would catch. Adding coverage now to prevent recurrence.
//
// Note on design: the matrices below use hardcoded role lists, not
// `Object.values(UserRole).filter(...)`. That's deliberate — when a new
// UserRole is added, the dev should make a conscious decision about
// where it fits in each matrix (warehouse? admin-or-above? what idle
// minutes?). A silent auto-include would weaken that pedagogy. The
// sentinel test directly below catches drift loudly.

describe("UserRole enum surface (sentinel for the matrices below)", () => {
  it("has exactly the expected set of roles — update the matrices below when this fails", () => {
    // When this assertion fails, a new UserRole was added or removed.
    // Search this file for every hardcoded role array and add/remove the
    // role with intent — do not just update this set to make the test
    // green. The matrices below encode authorization decisions that
    // must be made explicitly for each new role.
    expect(new Set(Object.values(UserRole))).toEqual(
      new Set([
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.OPS,
        UserRole.OPS_STAFF,
        UserRole.SUPPORT,
        UserRole.INVOICE,
        UserRole.FINANCE_STAFF,
        UserRole.WAREHOUSE_IMPHAL,
        UserRole.WAREHOUSE_DELHI,
        UserRole.WAREHOUSE_STAFF,
      ]),
    )
  })
})

describe("hasMinimumRole", () => {
  it("returns true when user role equals minimum", () => {
    expect(hasMinimumRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(true)
  })

  it("returns true when user role is above minimum", () => {
    expect(hasMinimumRole(UserRole.SUPER_ADMIN, UserRole.MANAGER)).toBe(true)
    expect(hasMinimumRole(UserRole.ADMIN, UserRole.OPS)).toBe(true)
  })

  it("returns false when user role is below minimum", () => {
    expect(hasMinimumRole(UserRole.SUPPORT, UserRole.ADMIN)).toBe(false)
    expect(hasMinimumRole(UserRole.OPS_STAFF, UserRole.MANAGER)).toBe(false)
  })

  it("orders WAREHOUSE_IMPHAL = WAREHOUSE_DELHI in the hierarchy", () => {
    // Both warehouse-region roles are equal-rank by design (60). Either
    // can do what the other can; permissions differ by hub_code, not rank.
    expect(hasMinimumRole(UserRole.WAREHOUSE_IMPHAL, UserRole.WAREHOUSE_DELHI)).toBe(true)
    expect(hasMinimumRole(UserRole.WAREHOUSE_DELHI, UserRole.WAREHOUSE_IMPHAL)).toBe(true)
  })

  it("places SUPER_ADMIN strictly above every other role", () => {
    const others: UserRole[] = [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.OPS,
      UserRole.OPS_STAFF,
      UserRole.SUPPORT,
      UserRole.INVOICE,
      UserRole.FINANCE_STAFF,
      UserRole.WAREHOUSE_IMPHAL,
      UserRole.WAREHOUSE_DELHI,
      UserRole.WAREHOUSE_STAFF,
    ]
    for (const role of others) {
      expect(hasMinimumRole(UserRole.SUPER_ADMIN, role)).toBe(true)
      expect(hasMinimumRole(role, UserRole.SUPER_ADMIN)).toBe(false)
    }
  })
})

describe("getIdleMinutesForRole", () => {
  it("returns the configured value for each role", () => {
    expect(getIdleMinutesForRole(UserRole.SUPER_ADMIN)).toBe(60)
    expect(getIdleMinutesForRole(UserRole.ADMIN)).toBe(60)
    expect(getIdleMinutesForRole(UserRole.MANAGER)).toBe(45)
    expect(getIdleMinutesForRole(UserRole.OPS)).toBe(30)
    expect(getIdleMinutesForRole(UserRole.OPS_STAFF)).toBe(30)
    expect(getIdleMinutesForRole(UserRole.SUPPORT)).toBe(30)
    expect(getIdleMinutesForRole(UserRole.INVOICE)).toBe(30)
    expect(getIdleMinutesForRole(UserRole.FINANCE_STAFF)).toBe(30)
    expect(getIdleMinutesForRole(UserRole.WAREHOUSE_IMPHAL)).toBe(15)
    expect(getIdleMinutesForRole(UserRole.WAREHOUSE_DELHI)).toBe(15)
    expect(getIdleMinutesForRole(UserRole.WAREHOUSE_STAFF)).toBe(15)
  })

  it("falls back to the safe default when the role is null", () => {
    expect(getIdleMinutesForRole(null)).toBe(30)
  })

  it("falls back to the safe default when the role is undefined", () => {
    expect(getIdleMinutesForRole(undefined)).toBe(30)
  })

  it("returns warehouse-tight values (15 min) for every WAREHOUSE_* role", () => {
    // Warehouse terminals live in semi-public hub areas — tighter idle
    // policy is the documented intent. Lock that in.
    expect(getIdleMinutesForRole(UserRole.WAREHOUSE_IMPHAL)).toBe(15)
    expect(getIdleMinutesForRole(UserRole.WAREHOUSE_DELHI)).toBe(15)
    expect(getIdleMinutesForRole(UserRole.WAREHOUSE_STAFF)).toBe(15)
  })
})

describe("isWarehouseRole", () => {
  it("returns true for all WAREHOUSE_* roles", () => {
    expect(isWarehouseRole(UserRole.WAREHOUSE_IMPHAL)).toBe(true)
    expect(isWarehouseRole(UserRole.WAREHOUSE_DELHI)).toBe(true)
    expect(isWarehouseRole(UserRole.WAREHOUSE_STAFF)).toBe(true)
  })

  it("returns false for non-warehouse roles", () => {
    expect(isWarehouseRole(UserRole.SUPER_ADMIN)).toBe(false)
    expect(isWarehouseRole(UserRole.ADMIN)).toBe(false)
    expect(isWarehouseRole(UserRole.MANAGER)).toBe(false)
    expect(isWarehouseRole(UserRole.OPS)).toBe(false)
    expect(isWarehouseRole(UserRole.OPS_STAFF)).toBe(false)
    expect(isWarehouseRole(UserRole.SUPPORT)).toBe(false)
    expect(isWarehouseRole(UserRole.INVOICE)).toBe(false)
    expect(isWarehouseRole(UserRole.FINANCE_STAFF)).toBe(false)
  })
})

describe("isSuperAdmin", () => {
  it("returns true only for SUPER_ADMIN", () => {
    expect(isSuperAdmin(UserRole.SUPER_ADMIN)).toBe(true)
  })

  it("returns false for every non-SUPER_ADMIN role", () => {
    const others: UserRole[] = [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.OPS,
      UserRole.OPS_STAFF,
      UserRole.SUPPORT,
      UserRole.INVOICE,
      UserRole.FINANCE_STAFF,
      UserRole.WAREHOUSE_IMPHAL,
      UserRole.WAREHOUSE_DELHI,
      UserRole.WAREHOUSE_STAFF,
    ]
    for (const role of others) {
      expect(isSuperAdmin(role)).toBe(false)
    }
  })
})

describe("isAdminOrAbove", () => {
  it("returns true for SUPER_ADMIN and ADMIN", () => {
    expect(isAdminOrAbove(UserRole.SUPER_ADMIN)).toBe(true)
    expect(isAdminOrAbove(UserRole.ADMIN)).toBe(true)
  })

  it("returns false for MANAGER and below", () => {
    expect(isAdminOrAbove(UserRole.MANAGER)).toBe(false)
    expect(isAdminOrAbove(UserRole.OPS)).toBe(false)
    expect(isAdminOrAbove(UserRole.OPS_STAFF)).toBe(false)
    expect(isAdminOrAbove(UserRole.SUPPORT)).toBe(false)
    expect(isAdminOrAbove(UserRole.INVOICE)).toBe(false)
    expect(isAdminOrAbove(UserRole.FINANCE_STAFF)).toBe(false)
    expect(isAdminOrAbove(UserRole.WAREHOUSE_IMPHAL)).toBe(false)
    expect(isAdminOrAbove(UserRole.WAREHOUSE_DELHI)).toBe(false)
    expect(isAdminOrAbove(UserRole.WAREHOUSE_STAFF)).toBe(false)
  })
})

describe("isManagerOrAbove", () => {
  it("returns true for SUPER_ADMIN, ADMIN, MANAGER", () => {
    expect(isManagerOrAbove(UserRole.SUPER_ADMIN)).toBe(true)
    expect(isManagerOrAbove(UserRole.ADMIN)).toBe(true)
    expect(isManagerOrAbove(UserRole.MANAGER)).toBe(true)
  })

  it("returns false for OPS and below", () => {
    expect(isManagerOrAbove(UserRole.OPS)).toBe(false)
    expect(isManagerOrAbove(UserRole.OPS_STAFF)).toBe(false)
    expect(isManagerOrAbove(UserRole.SUPPORT)).toBe(false)
    expect(isManagerOrAbove(UserRole.INVOICE)).toBe(false)
    expect(isManagerOrAbove(UserRole.FINANCE_STAFF)).toBe(false)
    expect(isManagerOrAbove(UserRole.WAREHOUSE_IMPHAL)).toBe(false)
    expect(isManagerOrAbove(UserRole.WAREHOUSE_DELHI)).toBe(false)
    expect(isManagerOrAbove(UserRole.WAREHOUSE_STAFF)).toBe(false)
  })
})
