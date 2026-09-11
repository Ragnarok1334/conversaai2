"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MessageSquareQuote, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Review {
  id: string;
  name: string;
  business_name?: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      return () => { active = false; };
    }
    const supabase = createClient();
    Promise.all([
      supabase.auth.getUser(),
      supabase.from("reviews").select("id,name,business_name,rating,comment,created_at").eq("is_approved", true).order("created_at", { ascending: false }).limit(6),
    ]).then(([authResult, reviewResult]) => {
      if (!active) return;
      setUserId(authResult.data.user?.id || null);
      setReviews((reviewResult.data as Review[] | null) || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (!userId || name.trim().length < 2 || comment.trim().length < 10 || comment.trim().length > 500) {
      setMessage("Completa tu nombre y escribe una reseña de 10 a 500 caracteres.");
      return;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage("El servicio de reseñas no está disponible en este momento.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("reviews").insert({ user_id: userId, name: name.trim(), business_name: businessName.trim() || null, rating, comment: comment.trim() });
    setSubmitting(false);
    if (error) return setMessage("No pudimos enviar la reseña. Intenta nuevamente.");
    setName(""); setBusinessName(""); setComment(""); setRating(5);
    setMessage("¡Gracias! Tu reseña será visible después de la revisión.");
  };

  return (
    <section id="resenas" className="light-section light-reviews-section">
      <div className="light-container">
        <div className="light-heading">
          <span>EXPERIENCIAS REALES</span>
          <h2>Lo que dicen nuestros clientes.</h2>
          <p>Reseñas verificadas de personas que utilizan ConversaAI en sus negocios.</p>
        </div>

        {loading ? (
          <div className="light-reviews-loading"><Loader2 /> Cargando reseñas…</div>
        ) : reviews.length > 0 ? (
          <div className="light-reviews-grid">
            {reviews.slice(0, 3).map((review) => (
              <article className="light-review-card" key={review.id}>
                <div className="light-review-stars" aria-label={`${review.rating} de 5 estrellas`}>
                  {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={value <= review.rating ? "active" : ""} />)}
                </div>
                <blockquote>“{review.comment}”</blockquote>
                <div className="light-review-author"><span>{review.name.charAt(0).toUpperCase()}</span><div><strong>{review.name}</strong>{review.business_name && <small>{review.business_name}</small>}</div></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="light-reviews-empty"><MessageSquareQuote /><div><strong>La comunidad está comenzando.</strong><p>Sé la primera persona en compartir una experiencia real con ConversaAI.</p></div></div>
        )}

        <details className="light-review-form-wrap">
          <summary>Compartir mi experiencia</summary>
          {userId ? (
            <form onSubmit={submitReview} className="light-review-form">
              <div className="light-review-rating"><span>Calificación</span>{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} estrellas`}><Star className={value <= rating ? "active" : ""} /></button>)}</div>
              <div className="light-review-fields"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" maxLength={80} required /><input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Negocio (opcional)" maxLength={100} /></div>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Cuéntanos brevemente tu experiencia" minLength={10} maxLength={500} rows={3} required />
              <div className="light-review-submit"><span>{comment.length}/500</span><button type="submit" disabled={submitting}>{submitting ? "Enviando…" : "Enviar a revisión"}</button></div>
              {message && <p className="light-review-message"><CheckCircle2 /> {message}</p>}
            </form>
          ) : <p className="light-review-login">Para publicar una reseña debes <Link href="/login?redirect=/#resenas">iniciar sesión</Link>.</p>}
        </details>
      </div>
    </section>
  );
}
