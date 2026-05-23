"use client";

import { useState, useEffect } from "react";
import { Star, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface Review {
  id: string;
  user_id: string;
  name: string;
  business_name?: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  
  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Check Auth
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      setUserId(data.user?.id || null);
    });

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchReviews();

    // Setup Realtime subscription
    const channel = supabase
      .channel('public:reviews')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reviews', filter: 'is_approved=eq.true' },
        (payload) => {
          setReviews((prev) => [payload.new as Review, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("El comentario debe tener al menos 10 caracteres.");
      return;
    }
    if (comment.trim().length > 500) {
      setError("El comentario no puede exceder los 500 caracteres.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("La calificación debe estar entre 1 y 5.");
      return;
    }
    if (!userId) {
      setError("Debes iniciar sesión para publicar una reseña.");
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('reviews').insert({
        user_id: userId,
        name: name.trim(),
        business_name: businessName.trim() || null,
        rating,
        comment: comment.trim(),
        // is_approved defaults to false in DB, so it will wait for moderation
      });

      if (error) throw error;

      setSuccess(true);
      setName("");
      setBusinessName("");
      setRating(5);
      setComment("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setError(err.message || "Hubo un error al publicar la reseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
    : "0.0";

  return (
    <section className="relative py-28 overflow-hidden bg-[#0B1026]">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.13),transparent_28%)] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 mb-6">
            <Star className="w-4 h-4 text-[#06B6D4] fill-[#06B6D4]" />
            <span className="text-sm text-[#CBD5E1] font-medium">
              Reseñas de usuarios
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-[-0.03em]">
            Comparte tu experiencia con{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#2563EB] to-[#06B6D4]">
              ConversaAI
            </span>
          </h2>

          <p className="text-[#94A3B8] text-lg leading-relaxed mb-6">
            Comparte tu experiencia con ConversaAI y ayuda a otros negocios a conocer cómo puede mejorar su atención.
          </p>

          {totalReviews > 0 && (
            <div className="flex items-center justify-center gap-2 text-xl text-white font-medium">
              <span className="flex items-center gap-1">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                {averageRating}
              </span>
              <span className="text-[#94A3B8] text-base font-normal">
                de 5 basado en {totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'}
              </span>
            </div>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-[400px_1fr] gap-12 items-start">
          
          {/* Form Column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-[0_0_40px_rgba(124,58,237,0.06)] sticky top-28"
          >
            <h3 className="text-2xl font-semibold text-white mb-6">Deja tu reseña</h3>

            {!isLoggedIn ? (
              <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-xl p-6 text-center">
                <p className="text-white mb-4">Debes iniciar sesión para publicar una reseña.</p>
                <a 
                  href="/login?redirect=/#reviews" 
                  className="inline-block px-6 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                >
                  Iniciar sesión
                </a>
              </div>
            ) : success ? (
              <div className="bg-brand-success/10 border border-brand-success/30 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-brand-success mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">¡Gracias por tu reseña!</h4>
                <p className="text-sm text-[#94A3B8]">
                  Ha sido enviada a moderación y aparecerá pronto.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-6 text-brand-cyan hover:underline text-sm font-medium"
                >
                  Escribir otra
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Calificación *</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Tu nombre *</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#050816]/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div>
                  <label htmlFor="business" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Tu negocio (Opcional)</label>
                  <input
                    id="business"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-[#050816]/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all"
                    placeholder="Ej. Mi Tienda"
                  />
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Tu experiencia *</label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    rows={4}
                    className="w-full bg-[#050816]/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan/50 focus:bg-white/[0.05] transition-all resize-none"
                    placeholder="¿Qué es lo que más te gusta de ConversaAI?"
                  />
                  <div className="text-right mt-1">
                    <span className={`text-xs ${comment.length > 500 ? 'text-brand-pink' : 'text-[#94A3B8]'}`}>
                      {comment.length}/500
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity glow-violet disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    "Publicar reseña"
                  )}
                </button>
              </form>
            )}
          </motion.div>

          {/* Reviews List Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
                <Loader2 className="w-10 h-10 animate-spin text-[#06B6D4] mb-4" />
                <p>Cargando reseñas...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-12 text-center">
                <Star className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Todavía no hay reseñas</h3>
                <p className="text-[#94A3B8]">Sé el primero en compartir tu experiencia con nosotros.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 hover:bg-white/[0.06] transition-colors shadow-[0_0_30px_rgba(6,182,212,0.03)]"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`}
                        />
                      ))}
                    </div>
                    <p className="text-[#CBD5E1] text-sm leading-relaxed mb-6">
                      &quot;{review.comment}&quot;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-[2px] shrink-0">
                        <div className="w-full h-full rounded-full bg-[#050816] flex items-center justify-center text-white font-bold text-sm">
                          {review.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{review.name}</p>
                        {review.business_name && (
                          <p className="text-xs text-[#06B6D4] truncate">{review.business_name}</p>
                        )}
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">
                          {new Date(review.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
