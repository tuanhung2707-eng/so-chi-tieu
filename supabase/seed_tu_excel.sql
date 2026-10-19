-- =====================================================================
-- NHẬP DỮ LIỆU TỪ FILE EXCEL "So_tay_linh_kien_va_mat_khau_may.xlsx"
-- Chạy SAU work_schema.sql, ĐÚNG MỘT LẦN (chạy lại sẽ nhân đôi dữ liệu).
-- Dữ liệu được gán cho tài khoản người dùng đầu tiên trong Authentication → Users.
-- =====================================================================

insert into public.components (user_id, grp, name, code, function_text, repair_text)
select u.id, v.grp, v.name, v.code, v.function_text, v.repair_text
from (select id from auth.users order by created_at limit 1) u,
(values
  ('Diode', 'Diode Schottky', 'SS34 / SS24', 'Chỉnh lưu, chống dòng ngược hoặc làm diode hồi tiếp tùy mạch.', 'Cách kiểm tra: Ngắt nguồn, dùng chế độ diode kiểm tra chiều thuận/ngược; nhấc một chân nếu đo trong mạch bị ảnh hưởng.
Ghi chú: Đối chiếu datasheet.'),
  ('BJT', 'Transistor NPN/PNP', 'S8050 / S8550', 'Khuếch đại hoặc đóng/ngắt như công tắc.', 'Cách kiểm tra: Dùng chế độ diode kiểm tra B-E và B-C; kiểm tra C-E không chập bất thường; xác minh pinout.
Ghi chú: Không chỉ dựa vào mã in.'),
  ('MOSFET', 'MOSFET kênh N/P', 'AO3400A', 'Đóng/ngắt tải, điều khiển nguồn.', 'Cách kiểm tra: Xác định G/D/S theo datasheet; kiểm tra diode thân và chập D-S; xả điện tích cổng trước khi đo lại.
Ghi chú: Cẩn thận ESD.'),
  ('Tụ điện', 'Tụ gốm / tụ hóa', '104; 10 µF', 'Lọc nguồn, ghép tín hiệu, ổn định điện áp.', 'Cách kiểm tra: Xả tụ an toàn; đo điện dung/ESR nếu có thiết bị. Chế độ ohm chỉ phát hiện được một số lỗi.
Ghi chú: Tụ hóa phải đúng cực.'),
  ('IC nguồn', 'IC ổn áp / chuyển đổi', 'LM2576', 'Ổn định hoặc chuyển đổi điện áp nguồn.', 'Cách kiểm tra: Mất nguồn: kiểm tra chập VIN-GND/VOUT-GND; cấp nguồn giới hạn dòng: đo các chân theo datasheet.
Ghi chú: Xác minh pinout trước.'),
  ('IC sạc', 'IC sạc pin', '4057D', 'Điều khiển quá trình sạc pin.', 'Cách kiểm tra: Kiểm tra nguồn vào, chân pin, tín hiệu điều khiển và linh kiện ngoại vi theo datasheet.
Ghi chú: Mã IC có thể trùng.'),
  ('Điện trở', 'Điện trở SMD', '103 = 10 kΩ', 'Hạn dòng, chia áp, phân cực.', 'Cách kiểm tra: Đo điện trở; nhấc một chân nếu linh kiện song song làm sai lệch kết quả.
Ghi chú: Giải mã theo quy ước mã.'),
  ('Bảo vệ', 'TVS / ESD diode', 'Theo mã in', 'Kẹp xung quá áp, bảo vệ cổng tín hiệu/nguồn.', 'Cách kiểm tra: Ngắt nguồn, kiểm tra chập hai đầu; đánh giá chuyên sâu cần thiết bị phù hợp.
Ghi chú: Đồng hồ số không kết luận được mọi lỗi.')
) as v(grp, name, code, function_text, repair_text);

insert into public.machine_passwords (user_id, name, passwords)
select u.id, v.name, v.passwords::jsonb
from (select id from auth.users order by created_at limit 1) u,
(values
  ('PRODIGY', '[{"l": "Hiệu chỉnh", "v": "112112"}, {"l": "Hiệu chỉnh", "v": "111111"}, {"l": "Hiệu chỉnh", "v": "111222"}, {"l": "Hiệu chỉnh", "v": "561279"}, {"l": "Hiệu chỉnh", "v": "030230"}, {"l": "Hiệu chỉnh", "v": "112111"}, {"l": "Hiệu chỉnh", "v": "569548"}, {"l": "Hiệu chỉnh", "v": "112233"}, {"l": "Hiệu chỉnh", "v": "111333"}, {"l": "Hiệu chỉnh", "v": "379379"}, {"l": "Hiệu chỉnh", "v": "530360"}, {"l": "Hiệu chỉnh", "v": "292929"}, {"l": "Hiệu chỉnh", "v": "243666"}, {"l": "Hiệu chỉnh", "v": "221284"}, {"l": "Hiệu chỉnh", "v": "032130"}, {"l": "Hiệu chỉnh", "v": "771947"}, {"l": "Hiệu chỉnh", "v": "119119"}, {"l": "Hiệu chỉnh", "v": "686868"}, {"l": "Hiệu chỉnh", "v": "747474"}, {"l": "Hiệu chỉnh", "v": "888886"}, {"l": "Hiệu chỉnh", "v": "888648"}, {"l": "Hiệu chỉnh", "v": "257257"}, {"l": "Hiệu chỉnh", "v": "259259"}, {"l": "Hiệu chỉnh", "v": "888647"}, {"l": "Hiệu chỉnh", "v": "868884"}, {"l": "Hiệu chỉnh", "v": "242166"}, {"l": "Hiệu chỉnh", "v": "286710"}, {"l": "Hiệu chỉnh", "v": "888682"}, {"l": "Hiệu chỉnh", "v": "152582"}, {"l": "Hiệu chỉnh", "v": "282110"}, {"l": "Hiệu chỉnh", "v": "929292"}, {"l": "Hiệu chỉnh", "v": "179379"}, {"l": "Hiệu chỉnh", "v": "041218"}, {"l": "Hiệu chỉnh", "v": "123589"}, {"l": "Hiệu chỉnh", "v": "123582"}, {"l": "Hiệu chỉnh", "v": "199950"}, {"l": "Hiệu chỉnh", "v": "199951"}, {"l": "Hiệu chỉnh", "v": "888659"}, {"l": "Hiệu chỉnh", "v": "199965"}, {"l": "Hiệu chỉnh", "v": "908688"}, {"l": "Hiệu chỉnh", "v": "199949"}, {"l": "Hiệu chỉnh", "v": "953657"}, {"l": "Hiệu chỉnh", "v": "852488"}, {"l": "Hiệu chỉnh", "v": "363636"}]'),
  ('AJ - MORGAN', '[{"l": "Hiệu chỉnh", "v": "26715360"}]'),
  ('Cân cũ', '[{"l": "Hiệu chỉnh", "v": "253666"}]'),
  ('CT8600P', '[{"l": "Số hiệu cảnh sát", "v": "888888"}, {"l": "Pass", "v": "111111"}, {"l": "Pass cài đăt", "v": "966666"}]')
) as v(name, passwords);
