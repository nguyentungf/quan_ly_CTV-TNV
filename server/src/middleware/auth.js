import { verifyToken } from '../routes/auth.js';
import { db } from '../db/index.js';

// Middleware trích xuất thông tin người dùng từ Token (nếu có)
export function parseUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  req.user = verifyToken(token) || { role: 'guest', isGuest: true, displayName: 'Khách (Chế độ xem)' };
  next();
}

// Middleware bắt buộc phải đăng nhập (Không cho phép Khách sửa/xóa/điểm danh)
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const user = verifyToken(token);

  if (!user || user.role === 'guest' || user.isGuest) {
    return res.status(401).json({
      success: false,
      isAuthError: true,
      message: 'Bạn đang ở "Chế độ xem". Vui lòng đăng nhập quyền Nhóm trưởng hoặc Ban Quản Trị để thực hiện thao tác này!'
    });
  }

  req.user = user;
  next();
}

// Middleware chỉ dành riêng cho Ban Quản Trị (Admin)
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Thao tác này chỉ dành riêng cho Ban Chủ Nhiệm (Admin)!'
      });
    }
    next();
  });
}

// Middleware kiểm tra quyền theo Nhóm (Nhóm trưởng chỉ được sửa nhóm của mình)
export function checkGroupPermission(expectedTargetType) {
  return async (req, res, next) => {
    requireAuth(req, res, async () => {
      // Admin có toàn quyền mọi nhóm
      if (req.user.role === 'admin') {
        return next();
      }

      // Nhóm trưởng phải đúng loại nhân sự (CTV hoặc TNV)
      if (req.user.targetType !== expectedTargetType) {
        return res.status(403).json({
          success: false,
          message: `Tài khoản của bạn thuộc ${req.user.targetType.toUpperCase()}, không có quyền chỉnh sửa mục ${expectedTargetType.toUpperCase()}!`
        });
      }

      const userGroup = Number(req.user.groupNum);

      // 1. Kiểm tra groupNum truyền trực tiếp trong body hoặc query
      let reqGroup = req.body?.groupNum || req.body?.targetGroup || req.query?.group;
      if (reqGroup && reqGroup !== 'all') {
        const targetG = Number(reqGroup);
        if (!isNaN(targetG) && targetG !== userGroup) {
          return res.status(403).json({
            success: false,
            message: `Bạn chỉ có quyền quản lý Nhóm ${userGroup}, không được phép can thiệp vào Nhóm ${targetG}!`
          });
        }
      }

      // 2. Nếu thao tác theo memberId (sửa, xóa, điểm danh, chấm điểm)
      const memberId = req.params?.id || req.body?.memberId;
      if (memberId && !isNaN(Number(memberId))) {
        const table = expectedTargetType === 'ctv' ? 'ctv_members' : 'tnv_members';
        const member = await db.get(`SELECT group_num FROM ${table} WHERE id = ?`, [Number(memberId)]);
        if (member && Number(member.group_num) !== userGroup) {
          return res.status(403).json({
            success: false,
            message: `Thành viên này thuộc Nhóm ${member.group_num}. Bạn chỉ có quyền quản lý Nhóm ${userGroup}!`
          });
        }
      }

      // 3. Nếu thao tác hàng loạt (bulk-action)
      if (req.body?.memberIds && Array.isArray(req.body.memberIds)) {
        if (req.body.memberIds.length === 0) {
          return next();
        }
        const table = expectedTargetType === 'ctv' ? 'ctv_members' : 'tnv_members';
        const placeholders = req.body.memberIds.map(() => '?').join(',');
        const otherGroupMembers = await db.all(
          `SELECT id, full_name, group_num FROM ${table} WHERE id IN (${placeholders}) AND group_num != ?`,
          [...req.body.memberIds.map(Number), userGroup]
        );
        if (otherGroupMembers.length > 0) {
          return res.status(403).json({
            success: false,
            message: `Trong danh sách chọn có thành viên không thuộc Nhóm ${userGroup}. Bạn chỉ có quyền chỉnh sửa Nhóm ${userGroup}!`
          });
        }
      }

      next();
    });
  };
}

