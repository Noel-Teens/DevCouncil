"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "./AuthProvider";

/** Primary CTA that routes into the app (dashboard) or to login first. */
export default function StartCTA({ label = "Start reviewing" }: { label?: string }) {
  const { isAuthenticated } = useAuth();
  return (
    <motion.div
      className="inline-block"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <Link href={isAuthenticated ? "/dashboard" : "/login"} className="btn-primary text-[15px] px-6 py-3.5">
        {label}
        <ArrowRight size={17} strokeWidth={2.2} />
      </Link>
    </motion.div>
  );
}
