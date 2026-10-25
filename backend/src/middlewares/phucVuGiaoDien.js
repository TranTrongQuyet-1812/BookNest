/**
 * Phục vụ hai giao diện đã build (Storefront và Back-Office) ngay từ backend, chọn theo tên miền của request.
 * Dùng khi chạy trên Heroku (một app duy nhất, không có nginx). Trên máy dev vẫn dùng Vite, nên mặc định tắt
 * (bật bằng PHUC_VU_GIAO_DIEN=true).
 *
 * - Tên miền nằm trong BACKOFFICE_HOSTS: phục vụ frontend-admin/dist (khu quản trị).
 * - Mọi tên miền khác (kể cả herokuapp.com): phục vụ frontend/dist (trang khách).
 * - /api, /api-docs, /socket.io không bao giờ bị chặn ở đây, vẫn đi vào API như cũ.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');

const TIEN_TO_KHONG_PHUC_VU = ['/api', '/api-docs', '/socket.io'];

// Tên tệp có đuôi (ví dụ /assets/app.js) mà không tồn tại thì phải trả 404, không được trả index.html
const coDuoiTep = (duongDan) => path.extname(duongDan) !== '';

function taoPhucVuThuMuc(thuMuc) {
  const coIndex = fs.existsSync(path.join(thuMuc, 'index.html'));
  if (!coIndex) return null;
  return {
    thuMuc,
    tinh: express.static(thuMuc, {
      index: false,
      // Tệp trong /assets có mã băm trong tên nên cache lâu được; tệp còn lại (logo...) cache ngắn
      setHeaders: (res, duongDanTep) => {
        const laTaiNguyenCoMaBam = duongDanTep.includes(`${path.sep}assets${path.sep}`);
        res.setHeader('Cache-Control', laTaiNguyenCoMaBam ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
      }
    })
  };
}

/**
 * @param {{ thuMucKhach: string, thuMucQuanTri: string, hostQuanTri: string[] }} tuyChon
 */
function taoPhucVuGiaoDien({ thuMucKhach, thuMucQuanTri, hostQuanTri }) {
  const khach = taoPhucVuThuMuc(thuMucKhach);
  const quanTri = taoPhucVuThuMuc(thuMucQuanTri);
  const cacHostQuanTri = hostQuanTri.map(host => host.trim().toLowerCase()).filter(Boolean);

  return function phucVuGiaoDien(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (TIEN_TO_KHONG_PHUC_VU.some(tienTo => req.path === tienTo || req.path.startsWith(`${tienTo}/`))) return next();

    const laQuanTri = cacHostQuanTri.includes(String(req.hostname || '').toLowerCase());
    const giaoDien = laQuanTri ? quanTri : khach;
    if (!giaoDien) return next(); // chưa build giao diện này: để API và 404 xử lý như bình thường

    return giaoDien.tinh(req, res, (loi) => {
      if (loi) return next(loi);
      // Không phải tệp tĩnh: là đường dẫn của trang React (React Router), trả index.html để giao diện tự định tuyến
      if (coDuoiTep(req.path)) return next();
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(path.join(giaoDien.thuMuc, 'index.html'));
    });
  };
}

module.exports = { taoPhucVuGiaoDien };
