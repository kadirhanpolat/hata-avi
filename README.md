# Usev v2.19

**Düşün, yarış, kazan.**

## Yenilikler — v2.19

### 🏆 Mini Podyum (Oyuncu Ekranı)
Oyun bitince `finishedScreen`'de artık sadece "büyük ekranı izle" değil, oyuncunun **kendi sırası** ve **Top-5 liderboard** gösteriliyor.
- Staggered kart animasyonu (0.06s gecikme)
- Kendi satırı altın rengi + `is-me` vurgusu
- Top-3'ten sonra kendi sırasın → ekstra satır olarak eklenir

### ⌨️ Klavye Kısayolları (Moderatör)
| Tuş | Eylem |
|---|---|
| `Space` | Yayınla |
| `A` | Cevaplamayı Başlat |
| `R` | Cevabı Göster |
| `S` | Sinyal Gönder |
| `Enter` | Sonraki Soru |
| `H` veya `?` | Kısayol rehberini aç/kapat |
| `Esc` | Kısayol rehberini kapat |

Input/textarea odaklıyken otomatik devre dışı. Sağ alt köşede sabit **"⌨ Kısayollar"** pill butonu.

### 💡 İpucu Sistemi (Oyuncu Ekranı)
Editörde `İpucu` alanı dolu olan sorularda, cevaplama başladığında **"💡 İPUCU (−5 PT)"** butonu görünür.
- Tıklanınca ipucu kartı animasyonla açılır
- Cevap gönderildiğinde otomatik −5 PT düşülür
- Firebase'e `hintUsed: true` yazılır

### 🔍 İpucu Göstergesi (Moderatör)
Cevap listesinde ipucu kullanan oyuncular **💡** ikonu ile işaretlenir. Hover: "İpucu kullandı (−5 PT)"

## Sürüm Geçmişi
- v2.17 — Canlı istatistik paneli
- v2.18 — Moderatör paneli yenileme
- v2.19 — Mini podyum · Klavye kısayolları · İpucu sistemi (bu sürüm)
