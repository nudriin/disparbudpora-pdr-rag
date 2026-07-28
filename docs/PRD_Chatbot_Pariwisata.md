# Product Requirements Document (PRD)
**Sistem *Advanced RAG* dengan *Parent Document Retrieval* pada Telegram Chatbot untuk Layanan Pariwisata Kota Palangka Raya**

---

## 1. Latar Belakang (Requirement Background)
Kota Palangka Raya memiliki potensi pariwisata yang kaya, seperti Air Hitam Kereng Bangkirai, Manasa Agrowisata, hingga wisata budaya dan religi. Saat ini, penyampaian informasi pariwisata oleh Dinas Pariwisata, Kebudayaan, Kepemudaan dan Olah Raga (Disparbudpora) masih bersifat statis melalui portal *web* resmi. Wisatawan sering kali kesulitan mendapatkan jawaban cepat atas pertanyaan yang spesifik dan interaktif. 

Penerapan *Large Language Models* (LLM) standar rentan terhadap "halusinasi" atau pemberian informasi faktual yang salah. Sistem *Retrieval-Augmented Generation* (RAG) konvensional juga menghadapi dilema *chunking*: potongan kecil (*chunk*) meningkatkan presisi pencarian namun kehilangan konteks penting, sedangkan potongan besar mempertahankan konteks namun menurunkan presisi (menimbulkan *noise*). Oleh karena itu, diperlukan pendekatan ***Advanced RAG* menggunakan *Parent Document Retrieval* (PDR)**. Metode ini membagi dokumen ke dalam dua tingkat: *child documents* (untuk pencarian presisi tinggi) dan *parent documents* (untuk memberikan konteks luas kepada LLM).

## 2. Tujuan (Requirement Objectives)
1. **Responsivitas & Akurasi**: Membangun *chatbot* Telegram pariwisata yang responsif dan mampu memberikan jawaban faktual berbasis data dari situs resmi Disparbudpora Kota Palangka Raya.
2. **Implementasi PDR**: Mengimplementasikan arsitektur *Advanced RAG* menggunakan metode *Parent Document Retrieval* untuk menyelesaikan dilema granulasi *chunking* dan menjaga keutuhan konteks.
3. **Kinerja Sistem**: Memastikan kualitas *chatbot* memenuhi standar kualitas dengan evaluasi metrik RAGAS (*Faithfulness, Answer Relevance, Context Utilization*) dengan nilai ambang batas ≥ 0.70.

---

## 3. Arsitektur Sistem & *Tech Stack*
Berdasarkan spesifikasi pengembangan, sistem ini akan dibangun menggunakan teknologi berikut:

- **Bahasa Pemrograman**: TypeScript (Node.js)
- **Kerangka Kerja NLP / RAG**: LangChain.js
- **Antarmuka Pengguna (Frontend)**: Telegram Chatbot (via Telegram Bot API)
- **Model *Embedding***: Google Embedding (gemini-embedding-001)
- **Basis Data Vektor (*Vector Database*)**: Chroma DB
- **Large Language Model (LLM)**: Google Gemini Flash (via API, tanpa *fine-tuning*)
- **Evaluasi**: Kerangka kerja RAGAS (*Retrieval-Augmented Generation Assessment*)

---

## 4. Detail Kebutuhan Fungsional (Functional Requirements)

Kebutuhan fungsional sistem dibagi menjadi beberapa modul utama yang saling terintegrasi dalam alur kerja *pipeline* RAG.

### 4.1 Modul Ingesti & Pemrosesan Data (Data Pipeline)
Modul ini bertanggung jawab untuk mempersiapkan basis pengetahuan (*knowledge base*) dari portal web Disparbudpora.
- **Kondisi Pemicu**: Proses inisialisasi basis pengetahuan atau pembaruan data berkala.
- **Logika Bisnis**:
  1. Melakukan *parsing* dan ekstraksi dokumen/artikel teks dari situs Disparbudpora.
  2. Menerapkan teknik ***Parent Document Chunking***: memecah teks menjadi *parent documents* (potongan besar/konteks utuh) dan setiap *parent document* dipecah lagi menjadi *child documents* (potongan kecil).
  3. Mengonversi *child documents* menjadi vektor menggunakan **Google Embedding**.
  4. Menyimpan vektor *child documents* beserta referensi ID ke *parent documents* yang sesuai di dalam **Chroma DB**.
- **Hasil**: Basis data vektor yang siap untuk pencarian semantik tingkat lanjut.

### 4.2 Modul *Retrieval* (Pencarian Hierarkis)
Modul ini bertugas mencari potongan informasi paling relevan berdasarkan kueri dari pengguna.
- **Kondisi Pemicu**: Pengguna mengirimkan pertanyaan melalui *chatbot* Telegram.
- **Logika Bisnis**:
  1. **Kueri Pengguna**: Sistem mengubah teks pertanyaan pengguna menjadi vektor menggunakan Google Embedding.
  2. ***Child Document Retrieval***: Sistem melakukan pencarian semantik (*similarity search*) di dalam Chroma DB untuk menemukan *child documents* yang paling mirip dengan vektor kueri (memberikan presisi tinggi).
  3. ***Parent Document Augmentation***: Setelah *child documents* ditemukan, sistem melacak dan mengambil *parent documents* aslinya dari penyimpanan. *Parent documents* ini tidak diambil dari pencarian vektor, melainkan dari referensi relasionalnya.
- **Hasil**: Konteks (*parent documents*) utuh dan komprehensif yang siap diumpankan ke LLM.

### 4.3 Modul Generasi Jawaban (*Generation*)
Modul ini bertugas menyusun respons akhir bagi pengguna dengan panduan konteks dari proses *retrieval*.
- **Kondisi Pemicu**: Keberhasilan pengambilan *parent documents* dari modul *retrieval*.
- **Logika Bisnis**:
  1. Menggabungkan kueri pengguna dan teks dari *parent documents* ke dalam templat *prompt* khusus.
  2. Templat *prompt* diinstruksikan untuk hanya menjawab berdasarkan konteks yang diberikan untuk menghindari "halusinasi".
  3. Memanggil API **Google Gemini Flash** untuk menghasilkan jawaban dalam bahasa alami (Bahasa Indonesia).
- **Hasil**: Teks jawaban yang koheren, relevan, dan faktual.

### 4.4 Modul Integrasi Antarmuka Telegram
Modul ini berfungsi sebagai jembatan komunikasi antara pengguna dan sistem *backend*.
- **Kondisi Pemicu**: Interaksi pengguna (mengirim pesan teks) ke *bot* Telegram.
- **Logika Bisnis**:
  1. Menggunakan metode *webhook* atau *long polling* untuk mendengarkan pesan masuk dari *server* Telegram secara *real-time*.
  2. Meneruskan teks kueri ke dalam *pipeline* RAG (*Retrieval* → *Generation*).
  3. Menerima hasil jawaban dari LLM dan mengirimkannya kembali ke obrolan (*chat*) pengguna terkait.
  4. Menangani pengecualian (seperti kegagalan jaringan atau API) dengan memberikan pesan balasan yang ramah.
- **Hasil**: Pengalaman interaksi *chatbot* yang mulus dan cepat.

### 4.5 Modul Evaluasi Kinerja (RAGAS)
Modul ini digunakan untuk memantau dan menguji performa model tanpa memerlukan anotasi manual.
- **Kondisi Pemicu**: Pengujian sistem di fase pengembangan atau evaluasi berkala.
- **Logika Bisnis**:
  1. Merekam kueri pengguna, konteks yang diambil (*parent documents*), dan jawaban yang dihasilkan sistem (*inference output*).
  2. Menggunakan LLM-as-a-Judge (Google Gemini) melalui kerangka kerja RAGAS untuk menghitung metrik:
     - ***Faithfulness***: Menilai apakah jawaban benar-benar berasal dari konteks.
     - ***Answer Relevance***: Menilai apakah jawaban langsung menanggapi inti kueri.
     - ***Context Utilization/Precision***: Menilai apakah *parent document* yang diambil efektif memberikan informasi bagi LLM.
- **Hasil**: Skor evaluasi kuantitatif (0.0 - 1.0) untuk memastikan kualitas *chatbot* berada di atas ambang batas 0.70.

---

## 5. Struktur Modul Teknis (*Technical Modules*)
Untuk mendukung kebutuhan fungsional di atas, kode *backend* Node.js (TypeScript) akan dipisah menjadi beberapa modul terisolasi (*separation of concerns*) sebagai berikut:

### 5.1. `Document Ingestion Module`
- **Fungsi**: Membaca dokumen mentah (*raw documents*) dari sumber lokal (seperti PDF/HTML/TXT) atau ekstraksi *web* dan memprosesnya menjadi teks bersih.
- **Komponen Utama**:
  - `DocumentLoaders`: Modul dari LangChain.js untuk membaca isi *file*.
  - `TextSplitter` (Parent): Memecah teks utuh menjadi *chunk* besar (misalnya 1000-2000 token) sebagai representasi dokumen induk.
  - `TextSplitter` (Child): Memecah *parent chunk* menjadi *chunk* kecil (misalnya 200-400 token) sebagai representasi pencarian.
  - **Output**: Pasangan *Parent-Child* dokumen yang siap di-*embed*.

### 5.2. `Database & Vector Store Module`
- **Fungsi**: Bertindak sebagai lapisan komunikasi dengan Chroma DB dan mengelola penyimpanan *embedding*.
- **Komponen Utama**:
  - `GoogleGenerativeAIEmbeddings`: Kelas untuk menghasilkan representasi vektor numerik dari teks *child documents*.
  - `Chroma VectorStore`: Koneksi *client* Chroma DB untuk menyimpan vektor dan menjalankan *similarity search*.
  - `DocumentStore` (misalnya `InMemoryStore` atau `RedisStore` via LangChain): Digunakan sebagai penyimpanan sekunder untuk menyimpan teks *parent documents* asli yang dipetakan dengan *ID relasional* dari *child documents*.

### 5.3. `Retrieval Module`
- **Fungsi**: Mengelola mekanisme pencarian hierarkis secara otomatis berdasarkan prinsip *Parent Document Retrieval*.
- **Komponen Utama**:
  - `ParentDocumentRetriever`: Komponen *retriever* khusus dari LangChain.js yang secara atomik melakukan:
    1. Mengubah kueri pengguna menjadi vektor.
    2. Mencari *child document* di dalam Chroma DB.
    3. Mengembalikan *parent document* utuh dari *Document Store* berdasarkan relasi *Child-to-Parent*.

### 5.4. `Generation (LLM) Module`
- **Fungsi**: Merakit templat *prompt* akhir dan menginisiasi pemanggilan API ke Google Gemini.
- **Komponen Utama**:
  - `ChatGoogleGenerativeAI` (Model: `gemini-2.5-flash`): Klien utama untuk berinteraksi dengan layanan LLM Google.
  - `PromptTemplate`: Instruksi sistem (*system prompt*) ketat yang membatasi LLM agar merumuskan jawaban semata-mata berdasarkan konteks yang diberikan oleh *Retrieval Module*.

### 5.5. `Telegram Bot Module`
- **Fungsi**: Menangani interaksi (I/O) dengan pengguna akhir melalui platform Telegram.
- **Komponen Utama**:
  - *Library* eksternal (seperti `telegraf` atau `node-telegram-bot-api`).
  - *Controller* untuk mendengarkan dan merespons *event* obrolan (`message:text`).
  - Mekanisme manajemen *error* (*try-catch*) untuk memberikan notifikasi gracefully jika *backend* atau LLM gagal merespons.

---

## 6. Alur Pipeline (*Pipeline Workflow*)
Sistem beroperasi menggunakan dua *pipeline* utama yang berjalan pada waktu (fase) yang berbeda.

### 6.1. *Pipeline 1: Data Ingestion* (Berjalan saat inisialisasi / pembaruan data)
1. **Load Data**: Membaca seluruh dokumen sumber (informasi destinasi, jadwal wisata, panduan) dari direktori data lokal.
2. **Parent Split**: Teks dipotong menjadi blok besar (misalnya per bab/halaman) dan diberi identitas unik (*Parent ID*).
3. **Child Split**: Setiap blok besar (Parent) dipotong kembali menjadi blok-blok kalimat yang lebih kecil (Child). Masing-masing Child menyimpan referensi langsung ke *Parent ID*-nya.
4. **Embed & Store**: 
   - Teks Child dikonversi menjadi vektor dan disimpan di dalam Chroma DB.
   - Teks Parent secara utuh disimpan ke dalam *Document Store* dengan *key* berupa *Parent ID*.
5. **Finish**: Basis pengetahuan siap digunakan untuk layanan.

### 6.2. *Pipeline 2: Query Processing* (Berjalan *real-time* saat ada chat dari pengguna)
1. **Receive Message**: Modul Telegram menerima teks pertanyaan dari pengguna (contoh: *"Apa saja wisata alam di Palangka Raya?"*).
2. **Vectorize Query**: Teks pertanyaan dikirim ke *Google Embedding* untuk diubah menjadi representasi vektor numerik.
3. **Child Retrieval**: Vektor kueri dibandingkan dengan vektor-vektor di Chroma DB menggunakan *Cosine Similarity* untuk mengambil sejumlah teks Child yang paling mirip secara makna (presisi tinggi).
4. **Parent Augmentation**: Menggunakan referensi *Parent ID* yang menempel pada teks Child hasil pencarian, sistem menarik *Parent Document* secara utuh dari *Document Store* (konteks utuh).
5. **Prompt Construction**: Kueri asli pengguna beserta Konteks (*Parent Document*) digabungkan ke dalam templat *prompt* standar.
6. **LLM Generation**: *Prompt* yang telah diperkaya (*augmented*) dikirim ke Google Gemini Flash. LLM merumuskan jawaban faktual berbahasa Indonesia.
7. **Send Response**: Modul Telegram mengirimkan teks jawaban tersebut kembali ke aplikasi Telegram pengguna.

---

## 7. Batasan & Pengecualian (*Boundaries & Exceptions*)
- **Closed-Domain Knowledge**: Sistem dirancang eksklusif untuk layanan informasi pariwisata Palangka Raya. Pertanyaan di luar konteks ini akan dijawab dengan batasan sopan (misal: "Maaf, saya hanya dapat membantu informasi pariwisata Kota Palangka Raya").
- **Keterbatasan LLM**: Model LLM digunakan secara *zero-shot* via API, tidak ada proses pelatihan ulang (*fine-tuning*) beban berat yang dilakukan.
- **Manajemen *Error***: Jika layanan pihak ketiga (Google API atau API Telegram) mengalami gangguan, sistem akan mencatat log *error* dan memberitahu pengguna untuk mencoba lagi beberapa saat kemudian.

---

## 8. Glosarium
- **LLM (*Large Language Model*)**: Model kecerdasan buatan yang mampu memahami dan menghasilkan teks bahasa alami.
- **RAG (*Retrieval-Augmented Generation*)**: Teknik yang membekali LLM dengan informasi dari basis data eksternal sebelum merespons kueri.
- ***Chunking***: Proses memotong dokumen teks yang panjang menjadi bagian-bagian yang lebih kecil.
- ***Parent Document Retrieval* (PDR)**: Strategi *Advanced RAG* yang mencari kesamaan semantik pada potongan teks kecil (*child*) namun mengembalikan potongan teks besar (*parent*) asalnya sebagai konteks.
- **Chroma DB**: Basis data vektor sumber terbuka (*open-source*) untuk menyimpan dan melakukan pencarian kemiripan (*similarity search*) berbasis vektor (AI *embeddings*).
- **RAGAS**: Kerangka kerja otomatis berbasis metrik untuk menilai kualitas sistem RAG.