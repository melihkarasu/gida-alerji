const DEFAULT_ALLERGENS = [
          { id: 'gluten', label: 'Gluten / Buğday' },
          { id: 'milk', label: 'Süt / Laktoz' },
          { id: 'eggs', label: 'Yumurta' },
          { id: 'peanuts', label: 'Yer Fıstığı' },
          { id: 'nuts', label: 'Sert Kabuklu Yemişler (Fındık/Ceviz)' },
          { id: 'soybeans', label: 'Soya' },
          { id: 'fish', label: 'Balık' },
          { id: 'crustaceans', label: 'Kabuklu Deniz Canlıları' },
          { id: 'sesame-seeds', label: 'Susam' }
        ];

        let userAllergens = [];

        function initAllergenProfile() {
          try {
            const raw = localStorage.getItem('vibe_user_allergens');
            userAllergens = raw ? JSON.parse(raw) : ['gluten', 'peanuts'];
          } catch(e) {
            userAllergens = ['gluten', 'peanuts'];
          }
          renderAllergenPills();
        }

        function renderAllergenPills() {
          const container = document.getElementById('allergen-pills');
          container.innerHTML = DEFAULT_ALLERGENS.map(a => {
            const active = userAllergens.includes(a.id);
            return `
              <button 
                type="button" 
                onclick="toggleAllergen('${a.id}')"
                class="px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 ${active ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs font-bold' : 'bg-white border-mistral-hairline text-mistral-slate hover:bg-mistral-cream'}">
                <span>${active ? '⚠️' : '○'}</span> ${a.label}
              </button>
            `;
          }).join('');
        }

        function toggleAllergen(id) {
          const idx = userAllergens.indexOf(id);
          if (idx >= 0) userAllergens.splice(idx, 1);
          else userAllergens.push(id);
          renderAllergenPills();
          saveAllergens();
          // Eğer ekranda sonuç varsa yeniden uyar
          const input = document.getElementById('food-search-input').value.trim();
          if (input) searchFood();
        }

        function addCustomAllergen() {
          const input = document.getElementById('custom-allergen-input');
          const val = input.value.trim().toLowerCase();
          if (!val) return;
          if (!DEFAULT_ALLERGENS.some(a => a.id === val)) {
            DEFAULT_ALLERGENS.push({ id: val, label: val.toUpperCase() });
          }
          if (!userAllergens.includes(val)) userAllergens.push(val);
          input.value = '';
          renderAllergenPills();
          saveAllergens();
        }

        function saveAllergens() {
          localStorage.setItem('vibe_user_allergens', JSON.stringify(userAllergens));
        }

        async function searchFood() {
          const input = document.getElementById('food-search-input').value.trim();
          const loading = document.getElementById('food-loading');
          const resultsBox = document.getElementById('food-results');

          if (!input) return;

          loading.classList.remove('hidden');
          resultsBox.innerHTML = '';

          try {
            const isBarcode = /^[0-9]{8,14}$/.test(input);
            const queryParam = isBarcode ? `barcode=${encodeURIComponent(input)}` : `q=${encodeURIComponent(input)}`;
            const res = await fetch(`/api/food/search?${queryParam}`);
            const data = await res.json();

            loading.classList.add('hidden');

            if (!data.success || !data.products || data.products.length === 0) {
              resultsBox.innerHTML = '<div class="p-8 text-center rounded-xl bg-white border border-mistral-hairline text-mistral-slate text-sm font-medium">Bu aramayla eşleşen ürün bulunamadı.</div>';
              return;
            }

            resultsBox.innerHTML = data.products.map(p => {
              // Alerjen kontrolü: Üründeki alerjenlerle kullanıcının profili eşleşiyor mu?
              const productAllergens = (p.allergens || []).map(a => a.toLowerCase());
              const ingredientsLower = (p.ingredientsText || '').toLowerCase();

              const triggeredAllergens = userAllergens.filter(userA => {
                return productAllergens.some(pa => pa.includes(userA)) || ingredientsLower.includes(userA);
              });

              const isDanger = triggeredAllergens.length > 0;

              return `
                <div class="p-6 rounded-2xl bg-white border ${isDanger ? 'border-rose-400 shadow-md shadow-rose-500/5' : 'border-mistral-hairline shadow-sm'} transition space-y-4">
                  
                  <!-- ALERJEN ALARMI (Eğer eşleşme varsa) -->
                  ${isDanger ? `
                    <div class="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-start gap-3">
                      <span class="text-2xl shrink-0">🚨</span>
                      <div>
                        <strong class="text-sm font-bold block">DİKKAT: Alerji Profilinizle Eşleşen Madde Tespit Edildi!</strong>
                        <p class="text-xs text-rose-700 mt-0.5">
                          Bu ürün hassas olduğunuz şu alerjenleri içeriyor olabilir: <strong>${triggeredAllergens.join(', ').toUpperCase()}</strong>
                        </p>
                      </div>
                    </div>
                  ` : `
                    <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <span>✓</span>
                      <span>Kişisel alerji profilinizle doğrudan eşleşen kritik bir içerik bulunamadı.</span>
                    </div>
                  `}

                  <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div class="md:col-span-3 aspect-square rounded-xl overflow-hidden bg-mistral-cream border border-mistral-beige-deep flex items-center justify-center p-2">
                      <img src="${p.image}" alt="${p.name}" class="w-full h-full object-contain">
                    </div>

                    <div class="md:col-span-9 space-y-3">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span class="text-xs font-semibold text-mistral-stone uppercase tracking-wider">${p.brands}</span>
                          <h3 class="text-xl sm:text-2xl font-bold font-editorial text-mistral-ink">${p.name}</h3>
                        </div>

                        <!-- Nutri-Score & Eko Skor Rozetleri -->
                        <div class="flex items-center gap-2">
                          <span class="px-3 py-1 rounded-lg text-xs font-black bg-white border border-mistral-hairline shadow-2xs font-mono">
                            Nutri-Score: <span class="text-mistral-orange">${p.nutriscore}</span>
                          </span>
                          <span class="px-3 py-1 rounded-lg text-xs font-black bg-white border border-mistral-hairline shadow-2xs font-mono">
                            Eko-Puan: <span class="text-emerald-600">${p.ecoscore}</span>
                          </span>
                        </div>
                      </div>

                      <!-- İçindekiler -->
                      <div class="text-xs text-mistral-slate">
                        <strong class="text-mistral-ink block mb-0.5">İçindekiler:</strong>
                        <p class="leading-relaxed bg-mistral-canvas/80 p-3 rounded-lg border border-mistral-hairline-soft font-mono text-[11px]">
                          ${p.ingredientsText}
                        </p>
                      </div>

                      <!-- Besin Değerleri Şeridi -->
                      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs pt-1">
                        <div class="p-2 rounded-lg bg-mistral-cream border border-mistral-beige-deep">
                          <span class="text-[10px] text-mistral-stone block">Enerji</span>
                          <strong class="text-mistral-ink font-bold">${p.nutriments.energyKcal} kcal</strong>
                        </div>
                        <div class="p-2 rounded-lg bg-mistral-cream border border-mistral-beige-deep">
                          <span class="text-[10px] text-mistral-stone block">Yağ</span>
                          <strong class="text-mistral-ink font-bold">${p.nutriments.fat}g</strong>
                        </div>
                        <div class="p-2 rounded-lg bg-mistral-cream border border-mistral-beige-deep">
                          <span class="text-[10px] text-mistral-stone block">Şeker</span>
                          <strong class="text-mistral-ink font-bold">${p.nutriments.sugar}g</strong>
                        </div>
                        <div class="p-2 rounded-lg bg-mistral-cream border border-mistral-beige-deep">
                          <span class="text-[10px] text-mistral-stone block">Protein</span>
                          <strong class="text-mistral-ink font-bold">${p.nutriments.proteins}g</strong>
                        </div>
                        <div class="p-2 rounded-lg bg-mistral-cream border border-mistral-beige-deep">
                          <span class="text-[10px] text-mistral-stone block">Tuz</span>
                          <strong class="text-mistral-ink font-bold">${p.nutriments.salt}g</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('');
          } catch(err) {
            loading.classList.add('hidden');
            resultsBox.innerHTML = '<div class="p-6 text-center text-rose-500 text-sm font-medium">Arama yapılamadı: ' + err.message + '</div>';
          }
        }

        function quickFood(term) {
          document.getElementById('food-search-input').value = term;
          searchFood();
        }

        document.addEventListener('DOMContentLoaded', initAllergenProfile);
