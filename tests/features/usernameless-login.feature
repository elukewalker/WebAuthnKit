Feature: Usernameless Login
  As a registered user with a discoverable credential
  I want to sign in without entering my username
  So that my login experience is frictionless

  Background:
    Given "registereduser" is registered with a discoverable credential
    And I am on the login page

  Scenario: Successful usernameless sign-in
    When I click "Usernameless Sign In"
    And the virtual authenticator returns the credential for "registereduser"
    Then I should be redirected to the dashboard
    And I should be signed in as "registereduser"
