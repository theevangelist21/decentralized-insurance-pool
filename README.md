# Decentralized Insurance Pool

A smart contract-based insurance pool built on the Stacks blockchain using Clarity. Users can contribute to a shared insurance fund and claim payouts when specific trigger conditions are met.

## Overview

The Decentralized Insurance Pool allows users to:
- Contribute STX tokens to a shared insurance pool
- Participate in risk-sharing with other contributors
- Claim payouts when trigger events are activated
- Benefit from transparent, on-chain insurance mechanics

## Features

### Core Functionality
- **Pool Contributions**: Users can contribute STX to increase the pool balance
- **Trigger Events**: Contract owner can activate insurance triggers with specific payout amounts
- **Claim System**: Contributors can claim payouts when triggers are active
- **Anti-Double Claim**: Prevents users from claiming multiple times for the same trigger
- **Emergency Controls**: Owner can manage the pool in emergency situations

### Security Features
- Owner-only trigger activation
- Contribution verification for claims
- Balance validation for all operations
- Claim tracking to prevent fraud

## Contract Functions

### Read-Only Functions
- \`get-pool-balance\`: Returns current pool balance
- \`get-user-contribution\`: Returns a user's total contributions
- \`get-total-contributors\`: Returns number of unique contributors
- \`is-trigger-active\`: Checks if a trigger is currently active
- \`get-current-trigger-id\`: Returns the current trigger ID
- \`get-payout-amount\`: Returns current payout amount
- \`has-claimed\`: Checks if user has claimed for a specific trigger
- \`get-trigger-event\`: Returns details of a specific trigger event

### Public Functions
- \`contribute\`: Add STX to the insurance pool
- \`activate-trigger\`: Activate an insurance trigger (owner only)
- \`claim-payout\`: Claim payout from active trigger
- \`deactivate-trigger\`: Deactivate current trigger (owner only)
- \`emergency-withdraw\`: Emergency pool withdrawal (owner only)

## Usage Example

### Contributing to the Pool
\`\`\`clarity
(contract-call? .insurance-pool contribute u1000000) ;; Contribute 1 STX
\`\`\`

### Activating a Trigger (Owner Only)
\`\`\`clarity
(contract-call? .insurance-pool activate-trigger "Natural disaster in region X" u500000)
\`\`\`

### Claiming Payout
\`\`\`clarity
(contract-call? .insurance-pool claim-payout)
\`\`\`

## Error Codes

- \`u100\`: Unauthorized access
- \`u101\`: Insufficient balance
- \`u102\`: Already claimed for this trigger
- \`u103\`: No active trigger
- \`u104\`: Invalid amount
- \`u105\`: Pool is empty

## Development

### Prerequisites
- Clarity CLI or Clarinet for local development
- Node.js for running tests

### Testing
Run the test suite:
\`\`\`bash
npm test
\`\`\`

### Deployment
Deploy to Stacks testnet or mainnet using your preferred deployment method.

## Security Considerations

- Only the contract owner can activate triggers
- Users must have contributed to the pool to claim payouts
- Each user can only claim once per trigger event
- Emergency functions are restricted to the contract owner
- All transfers are validated for sufficient balance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request
