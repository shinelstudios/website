// In Home.jsx or App.jsx (depending where your hero is)
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="h-screen flex flex-col items-center justify-center text-center bg-gradient-to-b from-black via-zinc-900 to-black text-white px-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl md:text-6xl font-extrabold mb-4"
      >
        We Create <span className="text-orange-500">Viral Videos</span> &
        <span className="text-orange-400"> Stunning Graphics</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-lg md:text-xl text-gray-300 max-w-2xl mb-6"
      >
        Video Editing • Thumbnails • Shorts • GFX — Everything you need to grow
        your channel 🚀
      </motion.p>

      <div className="flex gap-4">
        <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-lg">
          Get Started
        </Button>
        <Button variant="outline" className="border-gray-400 text-gray-200 px-6 py-3 rounded-xl text-lg">
          See Our Work
        </Button>
      </div>
    </section>
  );
}
