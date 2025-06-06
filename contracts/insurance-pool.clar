;; Decentralized Insurance Pool Contract
;; Users can contribute to a shared insurance pool and claim payouts when trigger conditions are met

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INSUFFICIENT_BALANCE (err u101))
(define-constant ERR_ALREADY_CLAIMED (err u102))
(define-constant ERR_NO_TRIGGER_ACTIVE (err u103))
(define-constant ERR_INVALID_AMOUNT (err u104))
(define-constant ERR_POOL_EMPTY (err u105))

;; Data Variables
(define-data-var pool-balance uint u0)
(define-data-var total-contributors uint u0)
(define-data-var trigger-active bool false)
(define-data-var trigger-id uint u0)
(define-data-var payout-amount uint u0)

;; Data Maps
(define-map contributors principal uint)
(define-map claims { trigger-id: uint, user: principal } bool)
(define-map trigger-events uint { description: (string-ascii 256), timestamp: uint, active: bool })

;; Read-only functions
(define-read-only (get-pool-balance)
  (var-get pool-balance)
)

(define-read-only (get-user-contribution (user principal))
  (default-to u0 (map-get? contributors user))
)

(define-read-only (get-total-contributors)
  (var-get total-contributors)
)

(define-read-only (is-trigger-active)
  (var-get trigger-active)
)

(define-read-only (get-current-trigger-id)
  (var-get trigger-id)
)

(define-read-only (get-payout-amount)
  (var-get payout-amount)
)

(define-read-only (has-claimed (user principal) (trigger uint))
  (default-to false (map-get? claims { trigger-id: trigger, user: user }))
)

(define-read-only (get-trigger-event (trigger uint))
  (map-get? trigger-events trigger)
)

;; Public functions

;; Contribute to the insurance pool
(define-public (contribute (amount uint))
  (begin
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    ;; Transfer STX to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    ;; Update user contribution
    (let ((current-contribution (get-user-contribution tx-sender)))
      (if (is-eq current-contribution u0)
        (var-set total-contributors (+ (var-get total-contributors) u1))
        true
      )
      (map-set contributors tx-sender (+ current-contribution amount))
    )

    ;; Update pool balance
    (var-set pool-balance (+ (var-get pool-balance) amount))

    (ok amount)
  )
)

;; Activate a trigger event (only contract owner)
(define-public (activate-trigger (description (string-ascii 256)) (payout uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (<= payout (var-get pool-balance)) ERR_INSUFFICIENT_BALANCE)

    (let ((new-trigger-id (+ (var-get trigger-id) u1)))
      ;; Create trigger event
      (map-set trigger-events new-trigger-id {
        description: description,
        timestamp: stacks-block-height,
        active: true
      })

      ;; Update trigger state
      (var-set trigger-id new-trigger-id)
      (var-set trigger-active true)
      (var-set payout-amount payout)

      (ok new-trigger-id)
    )
  )
)

;; Claim payout from active trigger
(define-public (claim-payout)
  (begin
    (asserts! (var-get trigger-active) ERR_NO_TRIGGER_ACTIVE)
    (asserts! (> (get-user-contribution tx-sender) u0) ERR_UNAUTHORIZED)
    (asserts! (not (has-claimed tx-sender (var-get trigger-id))) ERR_ALREADY_CLAIMED)
    (asserts! (>= (var-get pool-balance) (var-get payout-amount)) ERR_POOL_EMPTY)

    ;; Mark as claimed
    (map-set claims { trigger-id: (var-get trigger-id), user: tx-sender } true)

    ;; Transfer payout
    (try! (as-contract (stx-transfer? (var-get payout-amount) tx-sender tx-sender)))

    ;; Update pool balance
    (var-set pool-balance (- (var-get pool-balance) (var-get payout-amount)))

    (ok (var-get payout-amount))
  )
)

;; Deactivate current trigger (only contract owner)
(define-public (deactivate-trigger)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)

    (var-set trigger-active false)
    (var-set payout-amount u0)

    (ok true)
  )
)

;; Emergency withdraw (only contract owner, when no active triggers)
(define-public (emergency-withdraw (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (not (var-get trigger-active)) ERR_NO_TRIGGER_ACTIVE)
    (asserts! (<= amount (var-get pool-balance)) ERR_INSUFFICIENT_BALANCE)

    (try! (as-contract (stx-transfer? amount tx-sender CONTRACT_OWNER)))
    (var-set pool-balance (- (var-get pool-balance) amount))

    (ok amount)
  )
)
