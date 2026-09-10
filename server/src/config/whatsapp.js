import axios from 'axios';

export const sendWhatsApp = async (phone, message) => {
  try {
    const response = await axios.post(
      'https://api.fonnte.com/send',
      {
        target: phone,
        message,
      },
      {
        headers: {
          Authorization: process.env.FONNTE_API_KEY,
        },
      }
    );
    console.log('📱 WA sent to:', phone);
    return response.data;
  } catch (error) {
    console.error('❌ WA error:', error.message);
    return null;
  }
};

export default sendWhatsApp;