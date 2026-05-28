Feature: Credential Management
  As an authenticated user
  I want to manage my registered security keys
  So that I can keep my credentials organized and secure

  Background:
    Given "registereduser" is signed in
    And "registereduser" has at least one registered credential named "Security Key"
    And I am on the dashboard

  Scenario: View registered credentials
    Then I should see the credential "Security Key" in the credential list

  Scenario: Rename a credential
    When I rename credential "Security Key" to "My YubiKey"
    Then I should see "My YubiKey" in the credential list
    And "Security Key" should no longer appear in the list

  Scenario: Delete a credential
    When I delete credential "Security Key"
    Then "Security Key" should no longer appear in the credential list
    And no credential should exist for "registereduser" in the system
