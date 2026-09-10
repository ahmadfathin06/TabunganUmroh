const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const ApiResponse = require('../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  generateReferralCode,
} = require('../utils/generateToken');

const authController = {
  // ============ REGISTER ============
  register: async (req, res) => {
    try {
      const {
        name, email, password, phone,
        ktpNumber, address, hasPassport, referralCode
      } = req.validatedData;

      // Cek email sudah terdaftar
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return ApiResponse.error(res, 'Email sudah terdaftar', 409);
      }

      // Cek phone sudah terdaftar
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        return ApiResponse.error(res, 'No. HP sudah terdaftar', 409);
      }

      // Cek referral code valid (jika ada)
      let referredByCode = null;
      if (referralCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode },
        });
        if (!referrer) {
          return ApiResponse.error(res, 'Kode referral tidak valid', 400);
        }
        referredByCode = referralCode;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate referral code untuk user baru
      const myReferralCode = generateReferralCode(name);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          ktpNumber,
          address,
          hasPassport,
          referralCode: myReferralCode,
          referredBy: referredByCode,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          referralCode: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id);

      // Simpan refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      // Jika ada referral, buat reward
      if (referredByCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referredByCode },
        });

        await prisma.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: user.id,
            rewardType: 'BONUS_SALDO',
            rewardAmount: 50000, // Rp 50.000 bonus
          },
        });

        // Notifikasi ke yang nge-refer
        await prisma.notification.create({
          data: {
            userId: referrer.id,
            title: 'Referral Berhasil! 🎉',
            message: `${name} mendaftar dengan kode referral Anda. Bonus Rp 50.000 akan dikreditkan.`,
            type: 'REFERRAL_BONUS',
          },
        });
      }

      return ApiResponse.created(res, {
        user,
        tokens: { accessToken, refreshToken },
      }, 'Registrasi berhasil');

    } catch (error) {
      console.error('Register error:', error);
      return ApiResponse.error(res, 'Gagal melakukan registrasi');
    }
  },

  // ============ LOGIN ============
  login: async (req, res) => {
    try {
      const { email, password } = req.validatedData;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return ApiResponse.error(res, 'Email atau password salah', 401);
      }

      if (!user.isActive) {
        return ApiResponse.error(res, 'Akun anda dinonaktifkan', 403);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return ApiResponse.error(res, 'Email atau password salah', 401);
      }

      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      return ApiResponse.success(res, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
        },
        tokens: { accessToken, refreshToken },
      }, 'Login berhasil');

    } catch (error) {
      console.error('Login error:', error);
      return ApiResponse.error(res, 'Gagal melakukan login');
    }
  },

  // ============ REFRESH TOKEN ============
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ApiResponse.error(res, 'Refresh token diperlukan', 400);
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.refreshToken !== refreshToken) {
        return ApiResponse.error(res, 'Refresh token tidak valid', 401);
      }

      const newAccessToken = generateAccessToken(user.id, user.role);
      const newRefreshToken = generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return ApiResponse.success(res, {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      }, 'Token berhasil diperbarui');

    } catch (error) {
      return ApiResponse.error(res, 'Refresh token tidak valid', 401);
    }
  },

  // ============ LOGOUT ============
  logout: async (req, res) => {
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
      });

      return ApiResponse.success(res, null, 'Logout berhasil');
    } catch (error) {
      return ApiResponse.error(res, 'Gagal logout');
    }
  },

  // ============ GET ME ============
  getMe: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          ktpNumber: true,
          address: true,
          hasPassport: true,
          passportNumber: true,
          avatar: true,
          role: true,
          referralCode: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });

      return ApiResponse.success(res, user);
    } catch (error) {
      return ApiResponse.error(res, 'Gagal mengambil data user');
    }
  },
};

module.exports = authController;