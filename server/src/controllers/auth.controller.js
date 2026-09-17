import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateReferralCode,
} from '../utils/generateToken.js';
import { notify } from '../services/notification.service.js';
import { hashToken, safeCompare } from '../utils/tokenHash.js';

const authController = {
  // ============ REGISTER ============
  register: async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        ktpNumber,
        address,
        hasPassport,
        referralCode,
      } = req.validatedData;

      // Cek email duplikat
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) return ApiResponse.error(res, 'Email sudah terdaftar', 409);

      // Cek nomor telepon duplikat
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) return ApiResponse.error(res, 'No. HP sudah terdaftar', 409);

      // Cek kode referral jika ada
      let referredByCode = null;
      if (referralCode) {
        const referrer = await prisma.user.findUnique({ where: { referralCode } });
        if (!referrer) return ApiResponse.error(res, 'Kode referral tidak valid', 400);
        referredByCode = referralCode;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      const myReferralCode = generateReferralCode(name);

      // Simpan user baru
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

      // Generate JWT Token
      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        // Disimpan sebagai hash — kebocoran DB tidak langsung memberi sesi aktif.
        data: { refreshToken: hashToken(refreshToken) },
      });

      // Bonus referral jika mendaftar dengan kode
      if (referredByCode) {
        const referrer = await prisma.user.findUnique({ where: { referralCode: referredByCode } });
        await prisma.referralReward.create({
          data: {
            userId: referrer.id,
            referredUserId: user.id,
            rewardType: 'BONUS_SALDO',
            rewardAmount: 50000,
          },
        });
        const notification = await prisma.notification.create({
          data: {
            userId: referrer.id,
            title: 'Referral Berhasil! 🎉',
            message: `${name} mendaftar menggunakan kode referral Anda.`,
            type: 'REFERRAL_BONUS',
          },
        });
        notify(referrer.id, notification).catch(() => {});
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

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return ApiResponse.error(res, 'Email atau password salah', 401);
      if (!user.isActive) return ApiResponse.error(res, 'Akun dinonaktifkan', 403);

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return ApiResponse.error(res, 'Email atau password salah', 401);

      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        // Disimpan sebagai hash — kebocoran DB tidak langsung memberi sesi aktif.
        data: { refreshToken: hashToken(refreshToken) },
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
      const { refreshToken } = req.validatedData;

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      // DB menyimpan hash token, jadi bandingkan hash-nya (waktu-konstan).
      if (
        !user ||
        !user.refreshToken ||
        !user.isActive ||
        !safeCompare(user.refreshToken, hashToken(refreshToken))
      ) {
        return ApiResponse.error(res, 'Refresh token tidak valid', 401);
      }

      const newAccess = generateAccessToken(user.id, user.role);
      const newRefresh = generateRefreshToken(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashToken(newRefresh) },
      });

      return ApiResponse.success(res, {
        tokens: { accessToken: newAccess, refreshToken: newRefresh },
      });
    } catch (error) {
      return ApiResponse.error(res, 'Refresh token tidak valid atau kadaluarsa', 401);
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

  // ============ UPDATE PROFILE ============
  updateProfile: async (req, res) => {
    try {
      const data = { ...req.validatedData };

      if (data.hasPassport === false) {
        data.passportNumber = null;
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
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

      return ApiResponse.success(res, user, 'Profil berhasil diperbarui');
    } catch (error) {
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'Nomor HP sudah digunakan akun lain', 409);
      }
      console.error('Update profile error:', error);
      return ApiResponse.error(res, 'Gagal memperbarui profil');
    }
  },

  // ============ GET PROFILE SAYA ============
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
      return ApiResponse.error(res, 'Gagal mengambil profil user');
    }
  },
};

export default authController;