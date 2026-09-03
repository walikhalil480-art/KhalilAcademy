import { initializePaystackTransaction } from '../services/paystack.service';

async function testCurrency(curr: string) {
  console.log(`\nTesting currency: ${curr}...`);
  try {
    const reference = `PSK_TEST_${curr}_${Date.now()}`;
    const result = await initializePaystackTransaction({
      email: 'tcusub777@gmail.com',
      amount: 100.0,
      currency: curr,
      reference,
      metadata: { test: true },
    });
    console.log(`[SUCCESS with ${curr}] Authorization URL:`, result.authorization_url);
    return true;
  } catch (err: any) {
    console.log(`[FAILED with ${curr}]:`, err.message);
    return false;
  }
}

async function main() {
  const currencies = ['KES', 'NGN', 'GHS', 'ZAR', 'USD'];
  for (const c of currencies) {
    await testCurrency(c);
  }
}

main();
