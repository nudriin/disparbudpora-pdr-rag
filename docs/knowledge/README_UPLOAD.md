# Paket knowledge PDR-ready

Folder ini berisi parent document yang sudah dibersihkan agar siap diunggah ke sistem RAG dengan pendekatan Parent Document Retrieval.

## Isi folder

- `documents/deskriptif/`: parent document naratif dalam format PDF
- `documents/tabular/`: parent document tabular dalam format CSV
- `metadata/parent_documents.csv`: metadata utama untuk ingestion
- `metadata/parent_documents.jsonl`: metadata alternatif jika sistem Anda menerima JSONL
- `metadata/excluded_items.csv`: daftar file yang sengaja tidak dimasukkan ke paket upload

## Aturan kurasi

- Dokumen `pdf_ringkasan` deskriptif dipakai sebagai parent document
- Dokumen tabular diprioritaskan dalam bentuk CSV
- `dokumen_asli_pdf` tidak dimasukkan agar tidak terjadi duplikasi konten
- File administratif yang tidak relevan untuk pariwisata dikeluarkan
- Duplikasi berbasis hash file dibuang otomatis

## Saran ingest

- Gunakan `parent_id` sebagai identifier parent document
- Simpan `kategori`, `kelompok`, dan `url_sumber` sebagai metadata retriever
- Untuk chunking, lakukan split pada isi masing-masing file tanpa mencampur antar parent document
