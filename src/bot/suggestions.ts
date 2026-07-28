export interface SuggestionItem {
  label: string;
  text: string;
}

/**
 * Daftar pertanyaan populer default yang dijadikan ReplyKeyboard (tombol bawah chat)
 */
export const POPULAR_SUGGESTIONS: SuggestionItem[] = [
  {
    label: "🌿 Wisata Alam",
    text: "Apa saja destinasi wisata alam di Palangka Raya?",
  },
  {
    label: "👨‍💼 Pemandu Wisata",
    text: "Berikan daftar pemandu wisata di Palangka Raya",
  },
  {
    label: "🏕️ Nyaru Menteng",
    text: "Bagaimana fasilitas di Bumi Perkemahan Nyaru Menteng?",
  },
  {
    label: "🍲 Kuliner & Souvenir",
    text: "Apa saja kuliner khas dan oleh-oleh di Palangka Raya?",
  },
];

/**
 * Menghasilkan 3 saran pertanyaan turunan yang relevan berdasarkan pertanyaan & jawaban bot.
 */
export function getFollowUpSuggestions(
  userQuestion: string,
  botAnswer: string
): SuggestionItem[] {
  const q = userQuestion.toLowerCase();
  const a = botAnswer.toLowerCase();

  // Skenario 1: Jika membahas Pemandu Wisata
  if (q.includes("pemandu") || q.includes("tour guide") || a.includes("pemandu")) {
    return [
      { label: "📞 Kontak Pemandu", text: "Bagaimana cara menghubungi pemandu wisata tersebut?" },
      { label: "🌿 Wisata Alam Popular", text: "Apa saja destinasi wisata alam terpopuler?" },
      { label: "🏕️ Buper Nyaru Menteng", text: "Bagaimana fasilitas di Bumi Perkemahan Nyaru Menteng?" },
    ];
  }

  // Skenario 2: Jika membahas Wisata Alam / Danau / Buper
  if (q.includes("alam") || q.includes("danau") || q.includes("buper") || q.includes("nyaru menteng") || a.includes("wisata alam")) {
    return [
      { label: "📍 Lokasi & Akses", text: "Dimana lokasi dan bagaimana akses transportasinya?" },
      { label: "🎟️ Harga Tiket Masuk", text: "Berapa harga tiket masuknya?" },
      { label: "👨‍💼 Pemandu Wisata", text: "Berikan daftar pemandu wisata di Palangka Raya" },
    ];
  }

  // Skenario 3: Jika membahas Kuliner / Oleh-oleh / Budaya
  if (q.includes("kuliner") || q.includes("makanan") || q.includes("oleh") || q.includes("souvenir") || a.includes("kuliner")) {
    return [
      { label: "🍲 Makanan Khas", text: "Apa rekomendasi makanan khas Palangka Raya?" },
      { label: "🌿 Wisata Alam", text: "Apa saja destinasi wisata alam di Palangka Raya?" },
      { label: "🎭 Acara & Kebudayaan", text: "Apa saja event atau acara kebudayaan di Palangka Raya?" },
    ];
  }

  // Default Fallback Suggestions
  return [
    { label: "🌿 Wisata Alam", text: "Apa saja destinasi wisata alam di Palangka Raya?" },
    { label: "👨‍💼 Pemandu Wisata", text: "Berikan daftar pemandu wisata di Palangka Raya" },
    { label: "🍲 Kuliner & Souvenir", text: "Apa saja kuliner khas dan oleh-oleh di Palangka Raya?" },
  ];
}
