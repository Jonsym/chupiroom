import { APP_NAME } from '@/constants/app';
import type { CardScope, CardType, GameCard, GameMode, Intensity } from '@/types/game';

/**
 * Mock card decks (Spanish). No backend — these ship with the demo.
 *
 * Card text uses template tokens resolved by `renderCardText`:
 *   {{player}}   → the active player
 *   {{target}}   → one random other player (never the active player)
 *   {{targets}}  → `targetCount` random other players
 */

type RetoOpts = { intensity?: Intensity; scope?: CardScope; targetCount?: number };

/** Build a "reto directo" card. Scope drives the player/target requirements. */
const reto = (id: string, text: string, opts: RetoOpts = {}): GameCard => {
  const scope: CardScope = opts.scope ?? 'player';
  const targetCount = scope === 'target' ? (opts.targetCount ?? 1) : undefined;
  return {
    id,
    type: 'retos',
    text,
    // A target card needs the active player + its targets present.
    minPlayers: scope === 'target' ? 1 + (targetCount ?? 1) : 2,
    intensity: opts.intensity ?? 'medium',
    scope,
    targetCount,
    requiresCurrentPlayer: scope !== 'group',
    requiresTargetPlayer: scope === 'target',
  };
};

/** Build a "yo nunca nunca" card (always a group prompt). */
const nunca = (id: string, text: string, intensity: Intensity = 'medium'): GameCard => ({
  id,
  type: 'yo-nunca',
  text,
  minPlayers: 2,
  intensity,
  scope: 'group',
  requiresCurrentPlayer: false,
  requiresTargetPlayer: false,
});

/** Build a "votación" card (group vote prompt; text-only for now). */
const vota = (id: string, text: string, intensity: Intensity = 'medium'): GameCard => ({
  id,
  type: 'votaciones',
  text,
  minPlayers: 2,
  intensity,
  scope: 'group',
  requiresCurrentPlayer: false,
  requiresTargetPlayer: false,
});

/** Build a "verdad o toma" card (a truth question for the active player). */
const verdad = (id: string, text: string, intensity: Intensity = 'medium'): GameCard => ({
  id,
  type: 'verdad-o-toma',
  text,
  minPlayers: 2,
  intensity,
  scope: 'player',
  requiresCurrentPlayer: true,
  requiresTargetPlayer: false,
});

/** Build a "categorías" card (the active player starts naming a category). */
const categoria = (id: string, text: string, intensity: Intensity = 'low'): GameCard => ({
  id,
  type: 'categorias',
  text,
  minPlayers: 2,
  intensity,
  scope: 'player',
  requiresCurrentPlayer: true,
  requiresTargetPlayer: false,
});

/** Build a "regla temporal" card (a table rule that lasts `durationRounds`). */
const regla = (id: string, text: string, durationRounds = 2, intensity: Intensity = 'medium'): GameCard => ({
  id,
  type: 'reglas-temporales',
  text,
  minPlayers: 2,
  intensity,
  scope: 'group',
  requiresCurrentPlayer: false,
  requiresTargetPlayer: false,
  durationRounds,
});

export const retosDirectos: GameCard[] = [
  reto('r1', '{{player}} ahora es capitán. Elige a {{target}} para tomar 2.', { scope: 'target' }),
  reto('r2', '{{player}}, imita a tu streamer favorito durante 30 segundos o bebe.', { intensity: 'low' }),
  reto('r3', '{{player}} reparte 3 tragos entre {{targets}}.', { scope: 'target', targetCount: 2 }),
  reto('r4', '{{player}}, habla con acento extranjero hasta tu próximo turno o bebe.', { intensity: 'low' }),
  reto('r5', '{{player}} elige: bebes tú o {{targets}} beben por ti.', { scope: 'target', targetCount: 2 }),
  reto('r6', '{{player}}, cuenta tu anécdota más vergonzosa o bebe el doble.', { intensity: 'high' }),
  reto('r7', '{{player}} y {{target}} se enfrentan a pulsos. El que pierda toma.', { scope: 'target', intensity: 'low' }),
  reto('r8', '{{player}}, baila sin música durante 15 segundos o bebe.', { intensity: 'low' }),
  reto('r9', `{{player}} inventa un eslogan para ${APP_NAME} y lo grita. Si no convence, bebe.`, { intensity: 'low' }),
  reto('r10', '{{player}}, deja que el grupo vea tu última foto o bebe.', { intensity: 'high' }),
  reto('r11', '{{player}} hace 10 sentadillas o le pasa 2 tragos a {{target}}.', { scope: 'target' }),
  reto('r12', '{{player}}, manda un audio cantando a tu último chat o bebe.'),
  reto('r13', '{{player}} crea una norma nueva. Quien la incumpla esta ronda, bebe.'),
  reto('r14', '{{player}}, habla solo con preguntas hasta tu siguiente turno o bebe.', { intensity: 'low' }),
  reto('r15', '¡Todos juegan! El último en levantar la mano toma.', { scope: 'group', intensity: 'low' }),
  reto('r16', '¡Todos juegan! El último en tocar el suelo reparte 2 tragos.', { scope: 'group' }),
];

export const yoNuncaNunca: GameCard[] = [
  nunca('y1', 'Yo nunca nunca he mandado un mensaje del que me arrepentí.'),
  nunca('y2', 'Yo nunca nunca he stalkeado a un ex en redes sociales.'),
  nunca('y3', 'Yo nunca nunca me he quedado dormido en una fiesta.', 'low'),
  nunca('y4', 'Yo nunca nunca he mentido sobre mi edad.'),
  nunca('y5', 'Yo nunca nunca he fingido estar enfermo para no ir a trabajar.'),
  nunca('y6', 'Yo nunca nunca he enviado un mensaje a la persona equivocada.'),
  nunca('y7', 'Yo nunca nunca he cantado en la ducha a todo volumen.', 'low'),
  nunca('y8', 'Yo nunca nunca he revisado el teléfono de mi pareja.', 'high'),
  nunca('y9', 'Yo nunca nunca me he hecho el dormido para evitar a alguien.', 'high'),
  nunca('y10', 'Yo nunca nunca he llorado viendo una película de animación.', 'low'),
  nunca('y11', 'Yo nunca nunca he subido una historia y la he borrado al minuto.'),
  nunca('y12', 'Yo nunca nunca he prometido "solo una más" y he mentido.'),
  nunca('y13', 'Yo nunca nunca me he reído en un momento serio.', 'low'),
  nunca('y14', 'Yo nunca nunca he comido algo del suelo y he disimulado.', 'low'),
];

export const votaciones: GameCard[] = [
  vota('v1', 'Votad: ¿quién acabaría más borracho esta noche? El más votado toma 2.', 'low'),
  vota('v2', 'Votad: ¿quién es más probable que le escriba a su ex? El elegido bebe.'),
  vota('v3', 'Votad: ¿quién cuenta las mejores historias? El ganador reparte 1 trago.', 'low'),
  vota('v4', 'Votad: ¿quién llegaría tarde a su propia boda? El más votado toma.', 'low'),
  vota('v5', 'Votad: ¿quién es el más dramático del grupo? El elegido bebe.'),
  vota('v6', 'Votad: ¿quién haría la peor fiesta? El más votado toma 2.'),
  vota('v7', 'Votad: ¿quién miente mejor? El ganador elige a alguien para que beba.'),
  vota('v8', 'Votad: ¿quién se rendiría primero en este juego? El elegido bebe.', 'low'),
  vota('v9', 'Votad: ¿quién tiene el peor gusto musical? El más votado toma.', 'low'),
  vota('v10', 'Votad: ¿quién es más probable que se enamore esta noche? El elegido bebe 2.'),
  vota('v11', 'Votad: ¿quién haría cualquier reto sin pensarlo? El ganador reparte 2 tragos.'),
  vota('v12', 'Votad: ¿quién guarda más secretos? El más votado bebe.', 'high'),
  vota('v13', 'Votad: ¿quién sería el peor compañero de piso? El elegido toma.'),
  vota('v14', 'Votad: ¿quién es más probable que termine bailando sobre la mesa? Bebe el elegido.'),
  vota('v15', 'Votad: ¿quién se arrepiente más por las mañanas? El más votado toma 2.', 'high'),
  vota('v16', 'Votad: ¿quién ganaría un reality show? El ganador elige quién bebe.'),
];

export const verdadOToma: GameCard[] = [
  verdad('t1', '{{player}}, ¿cuál ha sido tu peor cita? Responde o toma.', 'low'),
  verdad('t2', '{{player}}, ¿a quién del grupo te llevarías a una isla desierta? Responde o toma.'),
  verdad('t3', '{{player}}, ¿cuál es tu manía más rara? Responde o toma.', 'low'),
  verdad('t4', '{{player}}, ¿cuántas mentiras has dicho hoy? Responde o toma.'),
  verdad('t5', '{{player}}, ¿cuál es el último secreto que te contaron? Responde o toma.', 'high'),
  verdad('t6', '{{player}}, ¿qué es lo más caro que has roto? Responde o toma.', 'low'),
  verdad('t7', '{{player}}, ¿cuál es tu placer culpable musical? Responde o toma.', 'low'),
  verdad('t8', '{{player}}, ¿a quién has stalkeado por última vez? Responde o toma.', 'high'),
  verdad('t9', '{{player}}, ¿cuál es tu mayor miedo? Responde o toma.'),
  verdad('t10', '{{player}}, ¿qué app abres nada más despertar? Responde o toma.', 'low'),
  verdad('t11', '{{player}}, ¿cuál ha sido tu borrachera más épica? Responde o toma.'),
  verdad('t12', '{{player}}, ¿qué harías con 1000€ ahora mismo? Responde o toma.', 'low'),
  verdad('t13', '{{player}}, ¿cuál es tu mayor arrepentimiento? Responde o toma.', 'high'),
  verdad('t14', '{{player}}, ¿a quién del grupo le darías un beso? Responde o toma.', 'high'),
  verdad('t15', '{{player}}, ¿cuál es la mayor mentira que les has dicho a tus padres? Responde o toma.'),
  verdad('t16', '{{player}}, ¿qué es lo más vergonzoso que hay en tu galería? Responde o toma.', 'high'),
];

export const categoriasCards: GameCard[] = [
  categoria('c1', 'Categoría: marcas de cerveza. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c2', 'Categoría: streamers en español. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c3', 'Categoría: tipos de cóctel. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c4', 'Categoría: equipos de fútbol. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c5', 'Categoría: marcas de coche. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c6', 'Categoría: países de Europa. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c7', 'Categoría: personajes de anime. Empieza {{player}}. El que repita o tarde toma.', 'medium'),
  categoria('c8', 'Categoría: redes sociales. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c9', 'Categoría: cantantes de reguetón. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c10', 'Categoría: cosas que hay en una discoteca. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c11', 'Categoría: marcas de ropa. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c12', 'Categoría: videojuegos. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c13', 'Categoría: razones para llegar tarde. Empieza {{player}}. El que repita o tarde toma.', 'medium'),
  categoria('c14', 'Categoría: excusas para no beber. Empieza {{player}}. El que repita o tarde toma.', 'medium'),
  categoria('c15', 'Categoría: películas de terror. Empieza {{player}}. El que repita o tarde toma.'),
  categoria('c16', 'Categoría: cosas que harías borracho pero no sobrio. Empieza {{player}}. El que repita o tarde toma.', 'high'),
];

export const reglasTemporales: GameCard[] = [
  regla('g1', "Durante 2 rondas, nadie puede decir 'yo'. Quien lo diga toma.", 2, 'low'),
  regla('g2', 'Durante 2 rondas, hay que beber con la mano no dominante. Quien falle toma.', 2, 'low'),
  regla('g3', 'Durante 3 rondas, prohibido decir nombres propios. Quien lo haga toma.', 3),
  regla('g4', 'Durante 2 rondas, hay que brindar antes de cada trago. Quien olvide toma.', 2, 'low'),
  regla('g5', 'Durante 3 rondas, nadie puede señalar con el dedo. Quien lo haga toma.', 3),
  regla('g6', 'Durante 2 rondas, está prohibido reírse. Quien ría toma.', 2),
  regla('g7', 'Durante 2 rondas, hay que hablar en voz baja. Quien grite toma.', 2, 'low'),
  regla('g8', "Durante 3 rondas, prohibido decir 'no'. Quien lo diga toma.", 3),
  regla('g9', 'Durante 2 rondas, hay que terminar cada frase con "salud". Quien olvide toma.', 2, 'low'),
  regla('g10', 'Durante 2 rondas, nadie puede usar el teléfono. Quien lo toque toma.', 2),
  regla('g11', 'Durante 3 rondas, hay que llamar "majestad" al jugador a tu izquierda.', 3),
  regla('g12', 'Durante 2 rondas, prohibido decir palabrotas. Quien suelte una toma.', 2, 'low'),
  regla('g13', 'Durante 2 rondas, hay que mantener un ojo cerrado. Quien lo abra toma.', 2),
  regla('g14', 'Durante 3 rondas, nadie puede beber sin pedir permiso al grupo.', 3),
  regla('g15', 'Durante 2 rondas, hay que responder todo con una pregunta. Quien falle toma.', 2),
  regla('g16', 'Durante 3 rondas, el último en tocarse la nariz tras cada carta toma.', 3, 'high'),
];

export const decks: Record<CardType, GameCard[]> = {
  retos: retosDirectos,
  'yo-nunca': yoNuncaNunca,
  votaciones,
  'verdad-o-toma': verdadOToma,
  categorias: categoriasCards,
  'reglas-temporales': reglasTemporales,
};

/**
 * Which card intensities each "modo" allows.
 * - clasico: suaves + medias
 * - caos: medias + fuertes
 */
export const modeIntensities: Record<GameMode, Intensity[]> = {
  clasico: ['low', 'medium'],
  caos: ['medium', 'high'],
};

export const cardTypeMeta: Record<
  CardType,
  { label: string; description: string }
> = {
  retos: {
    label: 'Retos directos',
    description: 'Un reto para el jugador de turno. Cúmplelo o bebe.',
  },
  'yo-nunca': {
    label: 'Yo nunca nunca',
    description: 'Si lo has hecho, bebes. Para todo el grupo.',
  },
  votaciones: {
    label: 'Votaciones',
    description: 'El grupo vota. El más votado bebe.',
  },
  'verdad-o-toma': {
    label: 'Verdad o toma',
    description: 'Una verdad para el jugador de turno. Responde o bebe.',
  },
  categorias: {
    label: 'Categorías',
    description: 'Decid cosas de una categoría por turnos. Quien repita o tarde, bebe.',
  },
  'reglas-temporales': {
    label: 'Reglas temporales',
    description: 'Una regla para la mesa durante unas rondas. Quien la incumpla, bebe.',
  },
};

/** Pick `n` distinct items at random (returns fewer if the pool is smaller). */
function sampleN<T>(pool: T[], n: number, rng: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

/** Join names in natural Spanish: "A", "A y B", "A, B y C". */
function joinNames(names: string[]): string {
  if (names.length === 0) return 'el grupo';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * Resolve a card's template tokens to a final string.
 *
 * - `{{player}}`  → `currentName`
 * - `{{target}}`  → one random name from `otherNames`
 * - `{{targets}}` → up to `card.targetCount` random names from `otherNames`
 *
 * `otherNames` must already exclude the current player, so targets can never
 * be the active player. Falls back gracefully when there aren't enough players.
 * `rng` is injectable for deterministic rendering/testing.
 */
export function renderCardText(
  card: GameCard,
  currentName: string,
  otherNames: string[],
  rng: () => number = Math.random,
): string {
  let text = card.text.split('{{player}}').join(currentName);

  if (text.includes('{{targets}}')) {
    const wanted = card.targetCount ?? 2;
    const picks = sampleN(otherNames, Math.min(wanted, otherNames.length), rng);
    text = text.split('{{targets}}').join(joinNames(picks));
  }

  if (text.includes('{{target}}')) {
    const pick = otherNames.length > 0 ? otherNames[Math.floor(rng() * otherNames.length)] : 'alguien';
    text = text.split('{{target}}').join(pick);
  }

  return text;
}
