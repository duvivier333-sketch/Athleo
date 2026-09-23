'use client';

import { useMemo, useState } from 'react';

type FoodItem = { id: number; name: string; kcal: number; grams: number; protein: number; carbs: number; fat: number };
type Meal = { id: number; title: string; foods: FoodItem[] };

type Tab = 'journal' | 'plan' | 'supplements';

const initialMeals: Meal[] = [
  {
    id: 1,
    title: 'Repas 1',
    foods: [
      { id: 11, name: "Flocons d’avoine · secs", kcal: 296, grams: 80, protein: 10, carbs: 48, fat: 6 },
      { id: 12, name: 'Skyr nature', kcal: 116, grams: 200, protein: 20, carbs: 8, fat: 0 },
    ],
  },
  {
    id: 2,
    title: 'Repas 2',
    foods: [
      { id: 21, name: 'Riz basmati · cuit', kcal: 312, grams: 240, protein: 6, carbs: 68, fat: 1 },
      { id: 22, name: 'Blanc de poulet', kcal: 280, grams: 170, protein: 48, carbs: 0, fat: 3 },
    ],
  },
  { id: 3, title: 'Repas 3', foods: [] },
  { id: 4, title: 'Repas 4', foods: [] },
];

function mealTotals(meal: Meal) {
  return meal.foods.reduce(
    (acc, food) => ({
      kcal: acc.kcal + food.kcal,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fat: acc.fat + food.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>('journal');
  const [meals, setMeals] = useState<Meal[]>(initialMeals);

  const totals = useMemo(() => meals.reduce((acc, meal) => {
    const value = mealTotals(meal);
    return {
      kcal: acc.kcal + value.kcal,
      protein: acc.protein + value.protein,
      carbs: acc.carbs + value.carbs,
      fat: acc.fat + value.fat,
    };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [meals]);

  function updateQuantity(mealId: number, foodId: number, grams: number) {
    setMeals(current => current.map(meal => {
      if (meal.id !== mealId) return meal;
      return {
        ...meal,
        foods: meal.foods.map(food => {
          if (food.id !== foodId) return food;
          const ratio = grams / food.grams;
          return {
            ...food,
            grams,
            kcal: Math.round(food.kcal * ratio),
            protein: Math.round(food.protein * ratio),
            carbs: Math.round(food.carbs * ratio),
            fat: Math.round(food.fat * ratio),
          };
        }),
      };
    }));
  }

  function removeFood(mealId: number, foodId: number) {
    setMeals(current => current.map(meal => meal.id === mealId ? { ...meal, foods: meal.foods.filter(food => food.id !== foodId) } : meal));
  }

  function removeMeal(mealId: number) {
    setMeals(current => current
      .filter(meal => meal.id !== mealId)
      .map((meal, index) => ({ ...meal, title: `Repas ${index + 1}` })));
  }

  function addMeal() {
    setMeals(current => [...current, { id: Date.now(), title: `Repas ${current.length + 1}`, foods: [] }]);
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
                    <div>
                      <h3>{meal.title}</h3>
                      <p>{sum.kcal} kcal · P {sum.protein} · G {sum.carbs} · L {sum.fat}</p>
                    </div>
                    <div className="nutrition-meal-actions">
                      <button>+ Ajouter un aliment</button>
                      <button className="nutrition-delete-meal" onClick={() => removeMeal(meal.id)} aria-label={`Supprimer ${meal.title}`}>Supprimer le repas</button>
                    </div>
                  </div>

                  {meal.foods.length > 0 ? (
                    <div className="nutrition-food-list">
                      {meal.foods.map(food => (
                        <div className="nutrition-food-row" key={food.id}>
                          <div className="nutrition-food-name"><b>{food.name}</b><span>{food.kcal} kcal</span></div>
                          <div className="nutrition-food-controls">
                            <input type="number" min="1" value={food.grams} onChange={event => updateQuantity(meal.id, food.id, Number(event.target.value) || 1)} aria-label={`Quantité de ${food.name}`} />
                            <span>g</span>
                            <button className="nutrition-remove" onClick={() => removeFood(meal.id, food.id)} aria-label={`Supprimer ${food.name}`}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="nutrition-empty">Aucun aliment ajouté.</div>
                  )}
                </article>
              );
            })}
          </div>

          <button className="nutrition-add-meal" onClick={addMeal}>+ Ajouter un repas</button>
          <div className="nutrition-demo-note">Banque de démonstration de 8 aliments. Ton fichier Excel n’est pas encore importé dans cette maquette.</div>
        </>
      )}

      {tab === 'plan' && (
        <section className="nutrition-placeholder-panel">
          <p>MON PLAN</p>
          <h2>Objectifs nutritionnels.</h2>
          <span>Cette zone accueillera les jours hauts, jours bas, calories cibles et macros de référence.</span>
        </section>
      )}

      {tab === 'supplements' && (
        <section className="nutrition-placeholder-panel">
          <p>COMPLÉMENTS</p>
          <h2>Ta routine de compléments.</h2>
          <span>Les prises, dosages et horaires pourront être gérés ici.</span>
        </section>
      )}
    </div>
  );
}
