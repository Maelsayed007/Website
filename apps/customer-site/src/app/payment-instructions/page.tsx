'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function PaymentInstructionsPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-start justify-center pt-44 pb-12 px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 overflow-hidden relative border border-stone-100">

        <div className="p-6 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-5"
          >
            <CheckCircle2 className="w-7 h-7 stroke-[3px]" />
          </motion.div>

          {/* Title & Desc */}
          <div className="space-y-1.5 mb-6">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Booking Request Sent!</h1>
            <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              We have received your details and are verifying availability.
            </p>
          </div>

          {/* Steps */}
          <div className="bg-gray-50/80 rounded-2xl p-5 text-left space-y-5 mb-6 border border-gray-100">
            <div className="flex gap-3.5 relative">
              {/* Line */}
              <div className="absolute top-7 left-[14px] w-[2px] h-[calc(100%-10px)] bg-gray-200"></div>

              {/* Step 1 */}
              <div className="flex-shrink-0 z-10 w-7 h-7 rounded-full bg-white border-2 border-gray-900 text-gray-900 flex items-center justify-center font-bold text-[10px] shadow-sm">1</div>
              <div className="pb-1">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide">Availability Check</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">We manually confirm the boat (approx. 2h).</p>
              </div>
            </div>

            <div className="flex gap-3.5 relative">
              {/* Step 2 */}
              <div className="flex-shrink-0 z-10 w-7 h-7 rounded-full bg-white border-2 border-green-500 text-green-600 flex items-center justify-center font-bold text-[10px] shadow-sm">2</div>
              <div className="pb-1">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide">Payment Link</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">You will receive an email of your booking and the payment instructions.</p>
              </div>
            </div>

            <div className="flex gap-3.5 relative">
              {/* Step 3 */}
              <div className="flex-shrink-0 z-10 w-7 h-7 rounded-full bg-white border-2 border-gray-200 text-gray-400 flex items-center justify-center font-bold text-[10px] shadow-sm">3</div>
              <div>
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide">Confirmation</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Booking confirmed & boarding pass sent.</p>
              </div>
            </div>
          </div>

          {/* Action */}
          <Link href="/">
            <Button className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-base shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]">
              Return to Home
            </Button>
          </Link>

          {/* Contact */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">Need help?</p>
            <a href="mailto:geral@amieiramarina.com" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors">
              <Mail className="w-3.5 h-3.5" />
              geral@amieiramarina.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
