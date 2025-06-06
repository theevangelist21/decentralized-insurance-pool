import { describe, it, expect, beforeEach } from "vitest";

// Mock contract state
let contractState = {
  poolBalance: 0,
  totalContributors: 0,
  triggerActive: false,
  triggerId: 0,
  payoutAmount: 0,
  contributors: new Map(),
  claims: new Map(),
  triggerEvents: new Map(),
  contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
};

// Mock contract functions
const mockContract = {
  contribute: (amount, sender) => {
    if (amount <= 0) return { error: "ERR_INVALID_AMOUNT" };

    const currentContribution = contractState.contributors.get(sender) || 0;
    if (currentContribution === 0) {
      contractState.totalContributors++;
    }

    contractState.contributors.set(sender, currentContribution + amount);
    contractState.poolBalance += amount;

    return { success: amount };
  },

  activateTrigger: (description, payout, sender) => {
    if (sender !== contractState.contractOwner)
      return { error: "ERR_UNAUTHORIZED" };
    if (payout > contractState.poolBalance)
      return { error: "ERR_INSUFFICIENT_BALANCE" };

    const newTriggerId = contractState.triggerId + 1;
    contractState.triggerEvents.set(newTriggerId, {
      description,
      timestamp: Date.now(),
      active: true,
    });

    contractState.triggerId = newTriggerId;
    contractState.triggerActive = true;
    contractState.payoutAmount = payout;

    return { success: newTriggerId };
  },

  claimPayout: (sender) => {
    if (!contractState.triggerActive) return { error: "ERR_NO_TRIGGER_ACTIVE" };
    if (!contractState.contributors.has(sender))
      return { error: "ERR_UNAUTHORIZED" };

    const claimKey = `${contractState.triggerId}-${sender}`;
    if (contractState.claims.has(claimKey))
      return { error: "ERR_ALREADY_CLAIMED" };
    if (contractState.poolBalance < contractState.payoutAmount)
      return { error: "ERR_POOL_EMPTY" };

    contractState.claims.set(claimKey, true);
    contractState.poolBalance -= contractState.payoutAmount;

    return { success: contractState.payoutAmount };
  },

  deactivateTrigger: (sender) => {
    if (sender !== contractState.contractOwner)
      return { error: "ERR_UNAUTHORIZED" };

    contractState.triggerActive = false;
    contractState.payoutAmount = 0;

    return { success: true };
  },

  getPoolBalance: () => contractState.poolBalance,
  getUserContribution: (user) => contractState.contributors.get(user) || 0,
  getTotalContributors: () => contractState.totalContributors,
  isTriggerActive: () => contractState.triggerActive,
  getCurrentTriggerId: () => contractState.triggerId,
  getPayoutAmount: () => contractState.payoutAmount,
  hasClaimed: (user, triggerId) =>
    contractState.claims.has(`${triggerId}-${user}`),
  getTriggerEvent: (triggerId) => contractState.triggerEvents.get(triggerId),
};

describe("Decentralized Insurance Pool", () => {
  beforeEach(() => {
    // Reset contract state before each test
    contractState = {
      poolBalance: 0,
      totalContributors: 0,
      triggerActive: false,
      triggerId: 0,
      payoutAmount: 0,
      contributors: new Map(),
      claims: new Map(),
      triggerEvents: new Map(),
      contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    };
  });

  describe("Pool Contributions", () => {
    it("should allow users to contribute to the pool", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const amount = 1000000; // 1 STX in microSTX

      const result = mockContract.contribute(amount, user);

      expect(result.success).toBe(amount);
      expect(mockContract.getPoolBalance()).toBe(amount);
      expect(mockContract.getUserContribution(user)).toBe(amount);
      expect(mockContract.getTotalContributors()).toBe(1);
    });

    it("should accumulate multiple contributions from same user", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      mockContract.contribute(500000, user);
      mockContract.contribute(300000, user);

      expect(mockContract.getUserContribution(user)).toBe(800000);
      expect(mockContract.getPoolBalance()).toBe(800000);
      expect(mockContract.getTotalContributors()).toBe(1);
    });

    it("should track multiple contributors", () => {
      const user1 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const user2 = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC";

      mockContract.contribute(1000000, user1);
      mockContract.contribute(2000000, user2);

      expect(mockContract.getTotalContributors()).toBe(2);
      expect(mockContract.getPoolBalance()).toBe(3000000);
    });

    it("should reject zero or negative contributions", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      const result1 = mockContract.contribute(0, user);
      const result2 = mockContract.contribute(-100, user);

      expect(result1.error).toBe("ERR_INVALID_AMOUNT");
      expect(result2.error).toBe("ERR_INVALID_AMOUNT");
    });
  });

  describe("Trigger Management", () => {
    it("should allow owner to activate triggers", () => {
      const owner = contractState.contractOwner;

      // First contribute to pool
      mockContract.contribute(2000000, owner);

      const result = mockContract.activateTrigger(
        "Test trigger",
        1000000,
        owner,
      );

      expect(result.success).toBe(1);
      expect(mockContract.isTriggerActive()).toBe(true);
      expect(mockContract.getCurrentTriggerId()).toBe(1);
      expect(mockContract.getPayoutAmount()).toBe(1000000);
    });

    it("should prevent non-owners from activating triggers", () => {
      const nonOwner = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      const result = mockContract.activateTrigger(
        "Test trigger",
        1000000,
        nonOwner,
      );

      expect(result.error).toBe("ERR_UNAUTHORIZED");
    });

    it("should prevent triggers with insufficient pool balance", () => {
      const owner = contractState.contractOwner;

      // Pool balance is 0, trying to create trigger with payout
      const result = mockContract.activateTrigger(
        "Test trigger",
        1000000,
        owner,
      );

      expect(result.error).toBe("ERR_INSUFFICIENT_BALANCE");
    });

    it("should allow owner to deactivate triggers", () => {
      const owner = contractState.contractOwner;

      // Setup active trigger
      mockContract.contribute(2000000, owner);
      mockContract.activateTrigger("Test trigger", 1000000, owner);

      const result = mockContract.deactivateTrigger(owner);

      expect(result.success).toBe(true);
      expect(mockContract.isTriggerActive()).toBe(false);
      expect(mockContract.getPayoutAmount()).toBe(0);
    });
  });

  describe("Claim Processing", () => {
    beforeEach(() => {
      // Setup pool with contributions and active trigger
      const user1 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const user2 = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC";
      const owner = contractState.contractOwner;

      mockContract.contribute(1000000, user1);
      mockContract.contribute(1000000, user2);
      mockContract.activateTrigger("Test disaster", 500000, owner);
    });

    it("should allow contributors to claim payouts", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      const result = mockContract.claimPayout(user);

      expect(result.success).toBe(500000);
      expect(mockContract.getPoolBalance()).toBe(1500000); // 2M - 500K
      expect(mockContract.hasClaimed(user, 1)).toBe(true);
    });

    it("should prevent non-contributors from claiming", () => {
      const nonContributor = "ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ";

      const result = mockContract.claimPayout(nonContributor);

      expect(result.error).toBe("ERR_UNAUTHORIZED");
    });

    it("should prevent double claims", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      // First claim should succeed
      const result1 = mockContract.claimPayout(user);
      expect(result1.success).toBe(500000);

      // Second claim should fail
      const result2 = mockContract.claimPayout(user);
      expect(result2.error).toBe("ERR_ALREADY_CLAIMED");
    });

    it("should prevent claims when no trigger is active", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const owner = contractState.contractOwner;

      // Deactivate trigger
      mockContract.deactivateTrigger(owner);

      const result = mockContract.claimPayout(user);

      expect(result.error).toBe("ERR_NO_TRIGGER_ACTIVE");
    });

    it("should prevent claims when pool is empty", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      // Drain the pool by setting balance to less than payout
      contractState.poolBalance = 100000; // Less than 500K payout

      const result = mockContract.claimPayout(user);

      expect(result.error).toBe("ERR_POOL_EMPTY");
    });
  });

  describe("Read-only Functions", () => {
    it("should return correct pool balance", () => {
      expect(mockContract.getPoolBalance()).toBe(0);

      mockContract.contribute(
        1000000,
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
      );
      expect(mockContract.getPoolBalance()).toBe(1000000);
    });

    it("should return correct user contributions", () => {
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      expect(mockContract.getUserContribution(user)).toBe(0);

      mockContract.contribute(500000, user);
      expect(mockContract.getUserContribution(user)).toBe(500000);
    });

    it("should return trigger event details", () => {
      const owner = contractState.contractOwner;
      mockContract.contribute(1000000, owner);
      mockContract.activateTrigger("Natural disaster", 500000, owner);

      const triggerEvent = mockContract.getTriggerEvent(1);

      expect(triggerEvent.description).toBe("Natural disaster");
      expect(triggerEvent.active).toBe(true);
      expect(triggerEvent.timestamp).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple triggers correctly", () => {
      const owner = contractState.contractOwner;
      const user = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";

      // Setup pool
      mockContract.contribute(3000000, user);

      // First trigger
      mockContract.activateTrigger("Trigger 1", 500000, owner);
      mockContract.claimPayout(user);
      mockContract.deactivateTrigger(owner);

      // Second trigger
      mockContract.activateTrigger("Trigger 2", 600000, owner);

      expect(mockContract.getCurrentTriggerId()).toBe(2);
      expect(mockContract.hasClaimed(user, 1)).toBe(true);
      expect(mockContract.hasClaimed(user, 2)).toBe(false);

      // User should be able to claim for second trigger
      const result = mockContract.claimPayout(user);
      expect(result.success).toBe(600000);
    });

    it("should maintain state consistency across operations", () => {
      const owner = contractState.contractOwner;
      const user1 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const user2 = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC";

      // Multiple contributions
      mockContract.contribute(1000000, user1);
      mockContract.contribute(1500000, user2);
      mockContract.contribute(500000, user1); // Second contribution from user1

      expect(mockContract.getTotalContributors()).toBe(2);
      expect(mockContract.getPoolBalance()).toBe(3000000);
      expect(mockContract.getUserContribution(user1)).toBe(1500000);

      // Activate trigger and process claims
      mockContract.activateTrigger("Major event", 800000, owner);
      mockContract.claimPayout(user1);

      expect(mockContract.getPoolBalance()).toBe(2200000);
      expect(mockContract.hasClaimed(user1, 1)).toBe(true);
      expect(mockContract.hasClaimed(user2, 1)).toBe(false);
    });
  });
});
