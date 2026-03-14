export interface StoryTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  title: string;
  userStory: string;
  acceptanceCriteria: Array<{ given: string; when: string; then: string }>;
  type: string;
  storyPoints: number;
  priority: string;
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: "auth-page",
    name: "Auth Page",
    icon: "Shield",
    description: "Login/signup page with form validation",
    title: "Build authentication page",
    userStory: "As a user, I want to sign up and log in so that I can access my account securely.",
    acceptanceCriteria: [
      { given: "I am on the login page", when: "I enter valid credentials", then: "I am redirected to the dashboard" },
      { given: "I am on the signup page", when: "I submit the registration form", then: "my account is created and I am logged in" },
      { given: "I enter invalid credentials", when: "I submit the form", then: "I see an appropriate error message" },
    ],
    type: "feature",
    storyPoints: 5,
    priority: "HIGH",
  },
  {
    id: "crud-endpoint",
    name: "CRUD Endpoint",
    icon: "Database",
    description: "RESTful API with create, read, update, delete",
    title: "Build CRUD API endpoint",
    userStory: "As a developer, I want a RESTful API endpoint so that I can manage resources programmatically.",
    acceptanceCriteria: [
      { given: "a valid request body", when: "I POST to the endpoint", then: "a new resource is created and returned" },
      { given: "an existing resource", when: "I GET the endpoint with an ID", then: "the resource details are returned" },
      { given: "an existing resource", when: "I PATCH with updated fields", then: "the resource is updated" },
      { given: "an existing resource", when: "I DELETE the endpoint", then: "the resource is removed" },
    ],
    type: "feature",
    storyPoints: 3,
    priority: "MEDIUM",
  },
  {
    id: "landing-page",
    name: "Landing Page",
    icon: "Layout",
    description: "Marketing page with hero, features, CTA",
    title: "Build landing page",
    userStory: "As a visitor, I want to see a compelling landing page so that I understand the product value.",
    acceptanceCriteria: [
      { given: "I visit the homepage", when: "the page loads", then: "I see a hero section with headline and CTA" },
      { given: "I scroll down", when: "I view the features section", then: "I see key product features with descriptions" },
      { given: "I am on mobile", when: "I view the page", then: "the layout is fully responsive" },
    ],
    type: "feature",
    storyPoints: 5,
    priority: "HIGH",
  },
  {
    id: "billing-integration",
    name: "Billing Integration",
    icon: "CreditCard",
    description: "Subscription billing with checkout and webhooks",
    title: "Integrate subscription billing",
    userStory: "As a user, I want to subscribe to a paid plan so that I can access premium features.",
    acceptanceCriteria: [
      { given: "I am on the pricing page", when: "I click subscribe", then: "I am redirected to the checkout page" },
      { given: "payment succeeds", when: "the billing webhook fires", then: "my plan is upgraded in the database" },
      { given: "I am a subscriber", when: "I visit the billing page", then: "I can manage my subscription" },
    ],
    type: "feature",
    storyPoints: 8,
    priority: "HIGH",
  },
  {
    id: "api-endpoint",
    name: "API Endpoint",
    icon: "Zap",
    description: "Single API route with validation and auth",
    title: "Build API endpoint",
    userStory: "As a developer, I want a new API endpoint so that the frontend can fetch or submit data.",
    acceptanceCriteria: [
      { given: "a valid authenticated request", when: "I call the endpoint", then: "the expected data is returned" },
      { given: "an unauthenticated request", when: "I call the endpoint", then: "a 401 error is returned" },
      { given: "invalid input", when: "I submit bad data", then: "a 400 error with validation details is returned" },
    ],
    type: "feature",
    storyPoints: 2,
    priority: "MEDIUM",
  },
  {
    id: "dashboard-page",
    name: "Dashboard Page",
    icon: "BarChart3",
    description: "Data dashboard with charts and stats",
    title: "Build dashboard page",
    userStory: "As a user, I want to see a dashboard with key metrics so that I can track my progress at a glance.",
    acceptanceCriteria: [
      { given: "I am logged in", when: "I visit the dashboard", then: "I see summary stats and charts" },
      { given: "data exists", when: "the charts render", then: "they display accurate data from the database" },
      { given: "no data exists", when: "I view the dashboard", then: "I see an empty state with guidance" },
    ],
    type: "feature",
    storyPoints: 5,
    priority: "MEDIUM",
  },
  {
    id: "form-validation",
    name: "Form with Validation",
    icon: "FormInput",
    description: "Multi-field form with client and server validation",
    title: "Build validated form",
    userStory: "As a user, I want to fill out a form with real-time validation so that I can submit correct data.",
    acceptanceCriteria: [
      { given: "I leave a required field empty", when: "I try to submit", then: "I see inline error messages" },
      { given: "I enter invalid data", when: "I blur the field", then: "real-time validation shows the error" },
      { given: "all fields are valid", when: "I submit the form", then: "the data is saved and I see a success message" },
    ],
    type: "feature",
    storyPoints: 3,
    priority: "MEDIUM",
  },
  {
    id: "email-notification",
    name: "Email Notification",
    icon: "Mail",
    description: "Transactional email with template",
    title: "Add email notification",
    userStory: "As a user, I want to receive email notifications so that I stay informed about important events.",
    acceptanceCriteria: [
      { given: "a triggering event occurs", when: "the system processes it", then: "an email is sent to the relevant user" },
      { given: "the email is sent", when: "the user opens it", then: "the email has a professional template with action button" },
      { given: "the user has disabled emails", when: "an event occurs", then: "no email is sent" },
    ],
    type: "feature",
    storyPoints: 3,
    priority: "LOW",
  },
];
