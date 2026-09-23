'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type FoodItem = {
  id: number;
  name: string;
  grams: number;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  state?: string;
  category?: string;
};
type Meal = { id: number; title: string; foods: FoodItem[] };
type Tab = 'journal' | 'plan' | 'supplements';
type FoodBankItem = {
  id: number;
  category: string;
  name: string;
  state: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  profile: string | null;
  note: string | null;
};

const initialMeals: Meal[] = [
  {
    id: 1,
    title: 'Repas 1',
    foods: [
      { id: 11, name: "Flocons d’avoine", grams: 80, kcal100: 376, protein100: 13.2, carbs100: 60, fat100: 7, state: 'Sec', category: 'Céréales & féculents' },
      { id: 12, name: 'Skyr nature 0%', grams: 200, kcal100: 58, protein100: 10, carbs100: 4, fat100: .2, state: 'Tel que vendu', category: 'Laitiers & protéines' },
    ],
  },
  {
    id: 2,
    title: 'Repas 2',
    foods: [
      { id: 21, name: 'Riz basmati blanc', grams: 100, kcal100: 351, protein100: 7.5, carbs100: 77.4, fat100: 1, state: 'Sec / avant cuisson', category: 'Céréales & féculents' },
      { id: 22, name: 'Blanc de poulet sans peau', grams: 170, kcal100: 103, protein100: 23.1, carbs100: 0, fat100: 1.2, state: 'Cru', category: 'Volaille' },
    ],
  },
  { id: 3, title: 'Repas 3', foods: [] },
  { id: 4, title: 'Repas 4', foods: [] },
];

const round = (value: number) => Math.round(value * 10) / 10;
const foodValue = (food: FoodItem) => ({
  kcal: Math.round(food.kcal100 * food.grams / 100),
  protein: round(food.protein100 * food.grams / 100),
  carbs: round(food.carbs100 * food.grams / 100),
  fat: round(food.fat100 * food.grams / 100),
});

function mealTotals(meal: Meal) {
  return meal.foods.reduce((acc, food) => {
    const value = foodValue(food);
    return {
      kcal: acc.kcal + value.kcal,
      protein: round(acc.protein + value.protein),
      carbs: round(acc.carbs + value.carbs),
      fat: round(acc.fat + value.fat),
    };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>('journal');
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [foodBank, setFoodBank] = useState<FoodBankItem[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    async function loadFoodBank() {
      setBankLoading(true);
      const { data } = await supabase
        .from('food_bank')
        .select('id, category, name, state, kcal, protein, carbs, fat, fiber, profile, note')
        .order('category')
        .order('name');
      setFoodBank((data || []) as FoodBankItem[]);
      setBankLoading(false);
    }
    loadFoodBank();
  }, []);

  const totals = useMemo(() => meals.reduce((acc, meal) => {
    const value = mealTotals(meal);
    return {
      kcal: acc.kcal + value.kcal,
      protein: round(acc.protein + value.protein),
      carbs: round(acc.carbs + value.carbs),
      fat: round(acc.fat + value.fat),
    };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [meals]);

  const categories = useMemo(() => ['Toutes', ...Array.from(new Set(foodBank.map(food => food.category)))], [foodBank]);
  const filteredFoods = useMemo(() => {
    const term = search.trim().toLowerCase();
    return foodBank.filter(food =>
      (category === 'Toutes' || food.category === category) &&
      (!term || food.name.toLowerCase().includes(term) || food.category.toLowerCase().includes(term) || (food.profile || '').toLowerCase().includes(term))
    );
  }, [foodBank, search, category]);

  function updateQuantity(mealId: number, foodId: number, grams: number) {
    setMeals(current => current.map(meal => meal.id === mealId
      ? { ...meal, foods: meal.foods.map(food => food.id === foodId ? { ...food, grams } : food) }
      : meal));
  }

  function removeFood(mealId: number, foodId: number) {
    setMeals(current => current.map(meal => meal.id === mealId ? { ...meal, foods: meal.foods.filter(food => food.id !== foodId) } : meal));
  }

  function removeMeal(mealId: number) {
    setMeals(current => current.filter(meal => meal.id !== mealId).map((meal, index) => ({ ...meal, title: `Repas ${index + 1}` })));
  }

  function addMeal() {
    setMeals(current => [...current, { id: Date.now(), title: `Repas ${current.length + 1}`, foods: [] }]);
  }

  function openFoodBank(mealId: number) {
    setSelectedMealId(mealId);
    setSearch('');
    setCategory('Toutes');
  }

  function addFood(food: FoodBankItem) {
    if (selectedMealId === null) return;
    const newFood: FoodItem = {
      id: Date.now() + food.id,
      name: food.name,
      grams: 100,
      kcal100: Number(food.kcal),
      protein100: Number(food.protein),
      carbs100: Number(food.carbs),
      fat100: Number(food.fat),
      state: food.state || undefined,
      category: food.category,
    };
    setMeals(current => current.map(meal => meal.id === selectedMealId ? { ...meal, foods: [...meal.foods, newFood] } : meal));
    setSelectedMealId(null);
  }

  return (
    <div className="nutrition-page-shell">
      <div className="nutrition-page-head">
        <p className="overline">DES REPÈRES CLAIRS</p>
        <h1>Nutrition<span>.</span></h1>
        <p>Ton plan, tes repas et tes compléments.</p>
      </div>

      <div className="nutrition-tabs" role="tablist">
        <button className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>Journal</button>
        <button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>Mon plan</button>
        <button className={tab === 'supplements' ? 'active' : ''} onClick={() => setTab('supplements')}>Compléments</button>
      </div>

      {tab === 'journal' && (
        <>
          <section className="nutrition-summary-card">
            <div>
              <p>AUJOURD’HUI · JOUR HAUT</p>
              <h2>{totals.kcal.toLocaleString('fr-FR')} <small>/ 2 800 kcal</small></h2>
              <span>Consommé · P {totals.protein} g · G {totals.carbs} g · L {totals.fat} g</span>
            </div>
            <span className="nutrition-fixed-badge">Objectifs fictifs</span>
          </section>

          <div className="nutrition-meals">
            {meals.map(meal => {
              const sum = mealTotals(meal);
              return (
                <article className="nutrition-meal-card" key={meal.id}>
                  <div className="nutrition-meal-head">
                    <div><h3>{meal.title}</h3><p>{sum.kcal} kcal · P {sum.protein} · G {sum.carbs} · L {sum.fat}</p></div>
                    <div className="nutrition-meal-actions">
                      <button onClick={() => openFoodBank(meal.id)}>+ Ajouter un aliment</button>
                      <button className="nutrition-delete-meal" onClick={() => removeMeal(meal.id)}>Supprimer le repas</button>
                    </div>
                  </div>

                  {meal.foods.length > 0 ? (
                    <div className="nutrition-food-list">
                      {meal.foods.map(food => {
                        const value = foodValue(food);
                        return (
                          <div className="nutrition-food-row" key={food.id}>
                            <div className="nutrition-food-name">
                              <b>{food.name}</b>
                              <span>{value.kcal} kcal · P {value.protein} · G {value.carbs} · L {value.fat}{food.state ? ` · ${food.state}` : ''}</span>
                            </div>
                            <div className="nutrition-food-controls">
                              <input type="number" min="1" value={food.grams} onChange={event => updateQuantity(meal.id, food.id, Number(event.target.value) || 1)} />
                              <span>g</span>
                              <button className="nutrition-remove" onClick={() => removeFood(meal.id, food.id)}>×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="nutrition-empty">Aucun aliment ajouté.</div>}
                </article>
              );
            })}
          </div>

          <button className="nutrition-add-meal" onClick={addMeal}>+ Ajouter un repas</button>
          <div className="nutrition-demo-note">Banque alimentaire connectée : {foodBank.length || 182} aliments issus de ton fichier Excel.</div>
        </>
      )}

      {tab === 'plan' && <section className="nutrition-placeholder-panel"><p>MON PLAN</p><h2>Objectifs nutritionnels.</h2><span>Cette zone accueillera les jours hauts, jours bas, calories cibles et macros de référence.</span></section>}
      {tab === 'supplements' && <section className="nutrition-placeholder-panel"><p>COMPLÉMENTS</p><h2>Ta routine de compléments.</h2><span>Les prises, dosages et horaires pourront être gérés ici.</span></section>}

      {selectedMealId !== null && (
        <div className="food-bank-overlay" onMouseDown={event => event.currentTarget === event.target && setSelectedMealId(null)}>
          <section className="food-bank-modal">
            <div className="food-bank-head">
              <div><p>MA BANQUE ALIMENTAIRE</p><h2>Ajouter un aliment</h2><span>{foodBank.length} aliments disponibles · valeurs pour 100 g</span></div>
              <button onClick={() => setSelectedMealId(null)}>×</button>
            </div>
            <div className="food-bank-filters">
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un aliment…" autoFocus />
              <select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select>
            </div>
            <div className="food-bank-list">
              {bankLoading ? <div className="food-bank-empty">Chargement…</div> : filteredFoods.length === 0 ? <div className="food-bank-empty">Aucun aliment trouvé.</div> : filteredFoods.map(food => (
                <button className="food-bank-row" key={food.id} onClick={() => addFood(food)}>
                  <div><b>{food.name}</b><span>{food.category} · {food.state}</span></div>
                  <div className="food-bank-macros"><strong>{food.kcal} kcal</strong><span>P {food.protein} · G {food.carbs} · L {food.fat}</span></div>
                  <span className="food-bank-plus">+</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
