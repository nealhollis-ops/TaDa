/**
 * The legal documents, kept as data so the page stays simple and the text is easy to review.
 * A `section` renders as a heading with paragraphs; a string inside `body` starting with "- "
 * renders as a bullet. Update `updated` whenever the wording changes.
 */
export type LegalDoc = {
  title: string;
  updated: string;
  intro: string[];
  sections: { h: string; body: string[] }[];
};

export const LEGAL_UPDATED = "September 18, 2026";

export const DOCS: Record<string, LegalDoc> = {
  terms: {
    title: "Terms of Service",
    updated: LEGAL_UPDATED,
    intro: [
      "TaDa is a daily planning app made by Data Forge Media (\"Data Forge Media\", \"we\", \"us\"). These terms are the agreement between you and Data Forge Media for using TaDa at app.gettada.me, including the installed version on your phone or computer.",
      "By creating an account or using TaDa you agree to these terms and to our Privacy Policy. If you do not agree, please do not use TaDa.",
    ],
    sections: [
      {
        h: "1. Who can use TaDa",
        body: [
          "You must be at least 13 years old to use TaDa. If you are under 18, a parent or legal guardian must agree to these terms on your behalf and is responsible for your use of the app.",
          "You must give accurate information when you sign up and keep your sign-in details to yourself. One account is for one person. You are responsible for everything that happens under your account, so tell us right away at clientcare@gettada.me if you think someone else has used it.",
        ],
      },
      {
        h: "2. Plans and pricing",
        body: [
          "TaDa is a paid subscription. Prices are in US dollars and are shown in the app before you buy. At the time of writing they are:",
          "- Standard: $17 a month or $170 a year. The full planner for one person, with one accountability partner.",
          "- Teams: $27 a month or $270 a year. Everything in Standard plus unlimited partners and named teams.",
          "- Boss: $97 a month or $970 a year. Everything in Teams plus the ability to assign work with deadlines and see its status. Seven member seats are included; each additional seat is $9 a month, billed to the Boss account.",
          "We may change prices. If we raise the price of a plan you are on, we will tell you by email at least 30 days before the new price takes effect, and it will apply from your next renewal after that date. Taxes may be added where the law requires.",
        ],
      },
      {
        h: "3. Free trial",
        body: [
          "Every new account gets a 14-day free trial of the plan you choose. A card is required to start the trial, but nothing is charged during it. When the trial ends, your first payment is taken automatically for the plan you chose and your subscription begins. Cancel from the Manage billing button in Account at any point before the trial ends and you will not be charged.",
          "The trial is offered once per person. Creating extra accounts to get additional trials is not allowed and we may close those accounts.",
        ],
      },
      {
        h: "4. Billing and renewal",
        body: [
          "Subscriptions renew automatically, monthly or yearly depending on what you chose, until you cancel. Payments are processed by Stripe. We never see or store your full card number.",
          "If a payment fails, Stripe will retry and we will email you. If it keeps failing, your plan pauses and TaDa shows the paywall until a payment goes through. Your tasks and data are kept while the plan is paused.",
          "Boss accounts are billed for member seats above the seven included. We count seats once a day and adjust the subscription, so adding or removing team members changes the next bill rather than creating a separate charge.",
        ],
      },
      {
        h: "5. Cancelling and refunds",
        body: [
          "You can cancel at any time from the Account screen, which opens your billing portal. Cancelling stops future charges. You keep access until the end of the period you have already paid for.",
          "Refunds are handled under our Refund Policy at app.gettada.me/legal/refunds. In short: if a charge was a mistake or you cancel shortly after being billed, write to us and a real person will sort it out.",
        ],
      },
      {
        h: "6. Complimentary accounts",
        body: [
          "We sometimes grant free (\"comp\") access to founders, testers, friends of the business, or as part of a promotion. Comp access can have an expiry date, can be changed or withdrawn by us at any time, and does not carry any right to a refund or to continued access. When a comp ends you can subscribe like anyone else.",
        ],
      },
      {
        h: "7. Partners, teams and boss teams",
        body: [
          "Accountability partners see each other's weekly and monthly progress numbers only. Nobody can see another member's task list, not even a partner.",
          "Teams are groups with their own discussion and a shared progress view. The person who creates a team owns it, can invite and remove members, and is responsible for how the team is used.",
          "A boss team is different, and you will be told before you join one. The team owner (the boss) can assign work to you with deadlines, sees the status of the work they assigned, and sees the email address you signed up with. Hidden and private settings do not apply inside a boss team. Your own task list stays yours; the boss only sees what the boss assigned.",
          "You can leave any team at any time from the Partners screen.",
        ],
      },
      {
        h: "8. The community",
        body: [
          "TaDa has a shared community where members post questions, wins and encouragement. Be the kind of person you would want in your corner. The following are not allowed:",
          "- Harassment, threats, hate, or targeting another member.",
          "- Sexual content, violence, or anything illegal.",
          "- Spam, advertising, pyramid or recruitment schemes, or posting the same thing over and over.",
          "- Sharing someone else's private information.",
          "- Pretending to be someone you are not.",
          "Any member can report a post or reply, and can block another member. We review reports and may remove content, hide posts, suspend, or close accounts that break these rules, with or without warning. Serious or repeated abuse ends your account without refund.",
        ],
      },
      {
        h: "9. Your content",
        body: [
          "Everything you type into TaDa, your tasks, posts, replies, messages, bio and photo, stays yours. You give Data Forge Media permission to store it, display it to the people you have chosen to share it with, and process it as needed to run the app. We do not use your content for advertising and we do not sell it.",
          "Posts and replies in the community are visible to every signed-in member. Think before you post.",
          "You are responsible for what you post. Do not post anything you do not have the right to share.",
        ],
      },
      {
        h: "10. AI features",
        body: [
          "The brain dump and the talking calendar use an artificial-intelligence service to turn what you type or say into tasks and calendar changes. The text you enter for those features is sent to our AI provider (Anthropic) to be processed and is not used to train their models. Results can be wrong, so check what the app suggests before you rely on it. Each member has a daily limit on AI requests to keep the service fair for everyone.",
          "Voice input uses your device's own speech recognition. TaDa does not record or store audio.",
        ],
      },
      {
        h: "11. Acceptable use",
        body: [
          "Do not try to break into TaDa, probe it for weaknesses, overload it, scrape it, reverse engineer it, or use it to send spam. Do not use automated tools to create accounts or post content. Do not resell access to TaDa.",
        ],
      },
      {
        h: "12. Our property",
        body: [
          "TaDa, its name, logo, design, code, the Ta-Da! recording, the daily power lines and the help content belong to Data Forge Media. You may use them inside the app as intended and not otherwise without our written permission.",
        ],
      },
      {
        h: "13. Availability and changes",
        body: [
          "We work hard to keep TaDa running, but we cannot promise it will always be available or error-free. We may change, add or remove features, and may need to take the service down for maintenance. If we ever decide to shut TaDa down, we will give you at least 30 days' notice by email and a way to get your data out.",
        ],
      },
      {
        h: "14. Ending your account",
        body: [
          "You can stop using TaDa at any time. To have your account and data deleted, email clientcare@gettada.me from the address on the account and we will do it within 30 days.",
          "We may suspend or close your account if you break these terms, if the law requires it, or if your account has been inactive and unpaid for more than 12 months.",
        ],
      },
      {
        h: "15. Disclaimers and limits on liability",
        body: [
          "TaDa is provided \"as is\". It is a planning tool, not professional advice of any kind. We make no promises about results.",
          "To the fullest extent the law allows, Data Forge Media is not liable for indirect, incidental, special or consequential damages, or for lost profits or lost data, arising from your use of TaDa. Our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim arose.",
          "Some places do not allow these limits, so some of them may not apply to you.",
        ],
      },
      {
        h: "16. Indemnity",
        body: [
          "If someone brings a claim against Data Forge Media because of something you posted or did in TaDa in breach of these terms, you agree to cover the reasonable costs of dealing with it.",
        ],
      },
      {
        h: "17. Governing law and disputes",
        body: [
          "These terms are governed by the laws of the United States and of the state in which Data Forge Media is organized, without regard to conflict-of-law rules. If we have a disagreement, please write to us first at clientcare@gettada.me; almost everything can be sorted out with a conversation. Any claim that cannot be resolved that way must be brought in the state or federal courts of that state.",
        ],
      },
      {
        h: "18. Changes to these terms",
        body: [
          "We may update these terms. If the change is material, we will email you or show a notice in the app at least 14 days before it takes effect. Continuing to use TaDa after that means you accept the new terms. The date at the top tells you when they last changed.",
        ],
      },
      {
        h: "19. Contact",
        body: ["Data Forge Media, clientcare@gettada.me. A real person reads every message."],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    updated: LEGAL_UPDATED,
    intro: [
      "This policy explains what information TaDa collects, why, who can see it, and the choices you have. TaDa is made by Data Forge Media (\"we\", \"us\"). We keep this in plain language on purpose.",
      "The short version: your tasks are private, we collect only what the app needs to work, we never sell your data, and you can ask us to delete everything.",
    ],
    sections: [
      {
        h: "1. What we collect",
        body: [
          "Account details: your email address, the name you enter, an optional photo, an optional short bio, and your sign-in credentials (passwords are stored only as a secure hash by our authentication provider; we cannot read them).",
          "Your planner: the tasks you create, their dates, time of day, repeat settings and completion, plus the statistics the app derives from them such as streaks, totals, badges and levels.",
          "Social activity: your accountability partners and requests, teams you belong to, direct and team messages, community posts, replies and reactions, reports you make, and members you block.",
          "Billing: your plan, trial and subscription status, and the customer and subscription identifiers Stripe gives us. We never receive or store your full card number.",
          "Devices and technical data: a notification subscription for each device you turn notifications on with, the browser type, and standard server logs (IP address, time, pages requested) kept for security and troubleshooting.",
          "AI inputs: the text you type into the brain dump or the talking calendar, so it can be turned into tasks.",
          "We do not collect your location, your contacts, or audio recordings. Voice input is handled by your device's own speech recognition; only the resulting text reaches us.",
        ],
      },
      {
        h: "2. How we use it",
        body: [
          "- To run the app: store your plan, show your progress, play your celebrations, deliver messages.",
          "- To bill you and manage your subscription.",
          "- To send the emails and notifications described below.",
          "- To keep TaDa safe: review reports, enforce the community rules, prevent abuse and fraud.",
          "- To understand how the app is used in aggregate so we can improve it. We look at totals, not at individual task lists.",
          "We do not sell your information, and we do not use it for advertising.",
        ],
      },
      {
        h: "3. Who can see what inside TaDa",
        body: [
          "Your task list is private. No other member can see it, including partners and teammates.",
          "Accountability partners see each other's weekly and monthly progress numbers. They do not see task titles.",
          "In a standard team, members see each other's progress numbers and the team discussion.",
          "In a boss team, the team owner also sees the work they assigned to you, its status, and the email address on your account. You are told this before you join a boss team.",
          "Your name, photo, streak, badges and level appear on your profile card, which other members can open. You can turn on \"Private profile\" in Account to stop that, or \"Keep me hidden\" to stay out of open partner lists. Your name still appears next to anything you post.",
          "Community posts and replies are visible to every signed-in member.",
          "Data Forge Media staff can see account and billing details, and community content, in order to run the service and handle reports. Staff do not browse members' task lists.",
        ],
      },
      {
        h: "4. Service providers we rely on",
        body: [
          "We use a small number of companies to run TaDa. Each receives only what it needs for its job and is bound by its own privacy terms:",
          "- Supabase: our database and sign-in system, where your account and planner data live. Hosted in the United States.",
          "- Vercel: hosts the app and serves it to your device.",
          "- Stripe: processes payments and stores your card securely. Stripe's privacy policy applies to the card details you enter on their checkout page.",
          "- Resend: sends our emails, such as sign-in links, invitations and receipts.",
          "- Anthropic: processes the text you enter into the AI features. Under our agreement that text is not used to train their models.",
          "- Push notifications travel through the notification service built into your browser or phone (for example Google, Apple or Mozilla). They see that a notification was sent to your device, not your planner data.",
        ],
      },
      {
        h: "5. Cookies and storage on your device",
        body: [
          "TaDa uses a sign-in cookie so you stay logged in. It uses local storage on your device for small conveniences, such as remembering that the welcome sound already played or which onboarding steps you finished. The installed app caches its own files so it opens quickly and works briefly offline.",
          "We do not use advertising cookies or third-party tracking pixels.",
        ],
      },
      {
        h: "6. Emails and notifications",
        body: [
          "We send emails you need: sign-in links, password resets, invitations, trial and billing notices, and occasional news about TaDa. You cannot opt out of the ones required to run your account, such as billing notices, while you have an account.",
          "Push notifications are off until you turn them on in Account. When on, your device is alerted to new direct messages, partner requests, team invitations, work assigned to you by a boss, and the occasional announcement from us. Turn them off at any time with the same switch.",
        ],
      },
      {
        h: "7. How long we keep it",
        body: [
          "We keep your data for as long as your account exists. When you ask us to delete your account we remove your profile, tasks, statistics, messages and notification subscriptions within 30 days. Posts and replies in the community are removed along with your name. Copies may remain in encrypted backups for up to 30 days after that before they are overwritten.",
          "We keep billing records for as long as tax and accounting law requires, typically seven years, and we keep a minimal record of closed or banned accounts to prevent the same person returning after being removed for abuse.",
        ],
      },
      {
        h: "8. Security",
        body: [
          "All traffic between your device and TaDa is encrypted. Data is encrypted at rest by our database provider. Access to the database is restricted by row-level rules so that each member's queries can only reach their own data or data they are entitled to see. Staff access is limited and logged.",
          "No system is perfectly secure. If we learn of a breach that affects your data we will tell you promptly.",
        ],
      },
      {
        h: "9. Children",
        body: [
          "TaDa is for people 13 and older. We do not knowingly collect information from anyone under 13. If you believe a child under 13 has an account, email clientcare@gettada.me and we will remove it.",
        ],
      },
      {
        h: "10. Your choices and rights",
        body: [
          "- See and change your information: name, photo, bio and privacy settings are on the Account screen. Tasks are editable in the app.",
          "- Export: email us and we will send you a copy of your tasks and profile in a common file format.",
          "- Delete: email us from the address on your account and we will delete it as described above.",
          "- Notifications: the switch is on the Account screen.",
          "Depending on where you live you may have additional rights, for example under the California Consumer Privacy Act or the European General Data Protection Regulation, including the right to know what we hold, to correct it, to have it deleted, and to complain to your local regulator. We honor these requests for everyone, wherever you are. We do not sell personal information and have not done so.",
        ],
      },
      {
        h: "11. Where your data lives",
        body: [
          "TaDa is operated from the United States and your data is stored there. If you use TaDa from elsewhere, you understand your information is transferred to and processed in the United States.",
        ],
      },
      {
        h: "12. Changes to this policy",
        body: [
          "If we change this policy in a material way we will email you or show a notice in the app before the change takes effect. The date at the top tells you when it last changed.",
        ],
      },
      {
        h: "13. Contact",
        body: ["Questions, requests, or concerns: clientcare@gettada.me. Data Forge Media."],
      },
    ],
  },

  refunds: {
    title: "Refund Policy",
    updated: LEGAL_UPDATED,
    intro: ["We would rather you leave happy than stay unhappy. Here is how trials, cancellations and refunds work."],
    sections: [
      {
        h: "Free trial",
        body: [
          "Every new account starts with 14 days free on the plan you pick. You add a card to start, and nothing is charged until the trial ends. On day 15 your first payment is taken for that plan. Cancel from the Manage billing button in Account before then and you pay nothing.",
        ],
      },
      {
        h: "Cancelling",
        body: [
          "Cancel any time from the Account screen. You will not be charged again, and you keep access until the end of the period you already paid for. There are no cancellation fees.",
        ],
      },
      {
        h: "Refunds",
        body: [
          "- If you were charged by mistake, for example a renewal after you meant to cancel, write to us within 14 days of the charge and we will refund it.",
          "- If you subscribed to a yearly plan and change your mind within 14 days of that payment, we will refund it in full.",
          "- Beyond that, we do not give partial refunds for unused time on a monthly or yearly plan, but if something went wrong on our side we will make it right.",
          "- Extra Boss seats are adjusted on your next bill rather than refunded separately.",
          "Refunds go back to the card you paid with and usually appear within 5 to 10 business days.",
        ],
      },
      {
        h: "How to ask",
        body: ["Email clientcare@gettada.me from the address on your account with the date and amount of the charge. A real person replies, usually within two business days."],
      },
    ],
  },
};
