export interface SampleMessage { id: string; label: string; text: string }

/** Clearly-fictional sample texts for the demo. Numbers are placeholders. */
export const SAMPLE_MESSAGES: SampleMessage[] = [
  { id: "fake-reversal", label: "“Sent by mistake” payment", text: "Confirmed. Ksh 4,500.00 has been sent to your M-PESA by mistake. Please send it back to 0700 000 123 urgently. Thank you." },
  { id: "account-link", label: "Account suspension link", text: "SAFARICOM ALERT: Your M-PESA account will be suspended within 24 hours. Verify now: http://safaricom-verify-account.xyz/login" },
  { id: "remote-access", label: "Fake bank support", text: "Hello, this is bank support. There is a problem with your account. Please install AnyDesk so we can fix it, and confirm your PIN to verify you." },
  { id: "prize", label: "Prize with a fee", text: "Congratulations! You have won KES 250,000 in the Mombasa Shopper lottery. Pay KES 1,500 registration fee to claim your prize: 0700 000 456." },
  { id: "customer-claim", label: "Customer says “I have paid”", text: "Hi, I have paid for the 3kg kingfish. Confirmed. Ksh 2,700.00 sent to Fatuma Said. Please release the order, I'm outside." },
  { id: "safety-tip", label: "Safety reminder (not a scam)", text: "Never share your M-PESA PIN with anyone. We will never ask for it." },
  { id: "ordinary", label: "Ordinary customer message", text: "Hi Fatuma, your tailoring order is ready for pickup tomorrow after 10am. Thanks!" },
];

export const SAMPLE_URLS = [
  "http://safaricom-verify-account.xyz/login",
  "https://bit.ly/3abcXYZ",
  "http://192.168.0.15/pay",
  "https://www.safaricom.co.ke",
];
