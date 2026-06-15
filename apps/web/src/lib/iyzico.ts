import crypto from 'crypto';

interface PaymentCard {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

interface Buyer {
  id: string;
  name: string;
  surname: string;
  email: string;
  identityNumber: string;
  phone: string;
  ip: string;
}

interface ProcessPaymentParams {
  price: number;
  planName: string;
  buyer: Buyer;
  paymentCard: PaymentCard;
}

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

function getIyzicoConfig(): IyzicoConfig | null {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

  if (!apiKey || apiKey === 'mock' || !secretKey || secretKey === 'mock') {
    return null;
  }

  return { apiKey, secretKey, baseUrl };
}

/**
 * Generates the x-iy-signature header for Iyzico REST API
 */
function generateSignature(
  apiKey: string,
  secretKey: string,
  randomString: string,
  body: string
): string {
  const data = apiKey + randomString + secretKey + body;
  return crypto.createHmac('sha1', secretKey).update(data).digest('base64');
}

/**
 * Processes a direct payment request through Iyzico API
 * Falls back to mock simulation if credentials are not present
 */
export async function processSubscriptionPayment(params: ProcessPaymentParams) {
  const config = getIyzicoConfig();
  const conversationId = crypto.randomUUID();

  if (!config) {
    console.log('[Iyzico mock] API credentials are not set. Simulating successful payment checkout...');
    
    // Simulate payment latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simple card number validations for testing
    const cleanCardNum = params.paymentCard.cardNumber.replace(/\s+/g, '');
    if (cleanCardNum.startsWith('4') || cleanCardNum.startsWith('5')) {
      return {
        success: true,
        isMock: true,
        paymentId: `mock_pay_${crypto.randomBytes(8).toString('hex')}`,
        conversationId,
        price: params.price,
        errorCode: null,
        errorMessage: null,
      };
    } else {
      return {
        success: false,
        isMock: true,
        paymentId: null,
        conversationId,
        price: params.price,
        errorCode: '10051',
        errorMessage: 'Kart limiti yetersiz veya işlem onaylanmadı. (Mock Hata: Visa/Mastercard test kartı kullanın. 4 veya 5 ile başlasın)',
      };
    }
  }

  const { apiKey, secretKey, baseUrl } = config;
  const priceStr = params.price.toFixed(2);

  // Build request body according to Iyzico specs
  const requestBody = {
    locale: 'tr',
    conversationId,
    price: priceStr,
    paidPrice: priceStr,
    currency: 'TRY',
    installments: '1',
    basketId: `b_${crypto.randomBytes(6).toString('hex')}`,
    paymentChannel: 'WEB',
    paymentGroup: 'PRODUCT',
    paymentCard: {
      cardHolderName: params.paymentCard.cardHolderName,
      cardNumber: params.paymentCard.cardNumber.replace(/\s+/g, ''),
      expireMonth: params.paymentCard.expireMonth.padStart(2, '0'),
      expireYear: params.paymentCard.expireYear.length === 2 ? `20${params.paymentCard.expireYear}` : params.paymentCard.expireYear,
      cvc: params.paymentCard.cvc,
      registerCard: 0
    },
    buyer: {
      id: params.buyer.id,
      name: params.buyer.name,
      surname: params.buyer.surname,
      gsmNumber: params.buyer.phone || '+905555555555',
      email: params.buyer.email,
      identityNumber: params.buyer.identityNumber || '11111111111',
      lastLoginDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      registrationDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      registrationAddress: 'Dershane Kayıt Adresi',
      ip: params.buyer.ip || '127.0.0.1',
      city: 'Istanbul',
      country: 'Turkey',
      zipCode: '34000'
    },
    shippingAddress: {
      contactName: `${params.buyer.name} ${params.buyer.surname}`,
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Dershane Kayıt Adresi',
      zipCode: '34000'
    },
    billingAddress: {
      contactName: `${params.buyer.name} ${params.buyer.surname}`,
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Dershane Kayıt Adresi',
      zipCode: '34000'
    },
    basketItems: [
      {
        id: `bi_${crypto.randomBytes(4).toString('hex')}`,
        name: `${params.planName} Yıllık Abonelik`,
        category1: 'Egitim Platformu',
        itemType: 'VIRTUAL',
        price: priceStr
      }
    ]
  };

  const bodyStr = JSON.stringify(requestBody);
  const randomString = Date.now().toString();
  const signature = generateSignature(apiKey, secretKey, randomString, bodyStr);

  try {
    const response = await fetch(`${baseUrl}/payment/auth`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-iy-api-key': apiKey,
        'x-iy-random-string': randomString,
        'x-iy-signature': signature,
        'x-iy-client-version': 'iyzipay-node-2.0.0',
      },
      body: bodyStr,
    });

    const data = await response.json();

    if (data.status === 'success') {
      return {
        success: true,
        isMock: false,
        paymentId: data.paymentId,
        conversationId: data.conversationId,
        price: params.price,
        errorCode: null,
        errorMessage: null,
      };
    } else {
      return {
        success: false,
        isMock: false,
        paymentId: null,
        conversationId: data.conversationId,
        price: params.price,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage || 'Ödeme işlemi başarısız.',
      };
    }
  } catch (error: any) {
    console.error('Iyzico API connection error:', error);
    return {
      success: false,
      isMock: false,
      paymentId: null,
      conversationId,
      price: params.price,
      errorCode: 'CONNECTION_ERROR',
      errorMessage: `İyzico sunucu bağlantı hatası: ${error.message}`,
    };
  }
}
