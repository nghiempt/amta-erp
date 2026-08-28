import { Loader2 } from "lucide-react";

// Suspense boundary cho mọi trang trong (app):
// bấm tab là chuyển ngay và hiện spinner, thay vì đứng im chờ server render xong
export default function Loading() {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-[#f1592a]" />
    </div>
  );
}
