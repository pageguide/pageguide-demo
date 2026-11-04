import type { Block } from './types';
import type { Post } from './library';
import { QUORA_CONTENT } from './quora-translations';

// English is the stable source language. IDs and reducer values never depend on translated labels.
const UI: Record<string, [string, string, string]> = {
  'Home feed': ['Inicio', 'Accueil', 'Trang chủ'],
  'Quora navigation': ['Navegación de Quora', 'Navigation Quora', 'Điều hướng Quora'],
  'Settings': ['Configuración', 'Paramètres', 'Cài đặt'],
  'Ask a question': ['Hacer una pregunta', 'Poser une question', 'Đặt câu hỏi'],
  'Saved posts': ['Publicaciones guardadas', 'Publications enregistrées', 'Bài viết đã lưu'],
  'Search posts': ['Buscar publicaciones', 'Rechercher des publications', 'Tìm bài viết'],
  'Search': ['Buscar', 'Rechercher', 'Tìm kiếm'],
  'Try Quora+': ['Probar Quora+', 'Essayer Quora+', 'Dùng thử Quora+'],
  'Create Space': ['Crear espacio', 'Créer un espace', 'Tạo không gian'],
  'Business': ['Negocios', 'Affaires', 'Kinh doanh'],
  'Movies': ['Cine', 'Cinéma', 'Phim ảnh'],
  'Technology': ['Tecnología', 'Technologie', 'Công nghệ'],
  'History': ['Historia', 'Histoire', 'Lịch sử'],
  'Spanish (language)': ['Español (idioma)', 'Espagnol (langue)', 'Tiếng Tây Ban Nha'],
  "PageGuide's Space": ['Espacio de PageGuide', 'Espace de PageGuide', 'Không gian của PageGuide'],
  'Cooking': ['Cocina', 'Cuisine', 'Nấu ăn'],
  'About Quora': ['Acerca de Quora', 'À propos de Quora', 'Giới thiệu Quora'],
  'Terms': ['Condiciones', 'Conditions', 'Điều khoản'],
  'Privacy': ['Privacidad', 'Confidentialité', 'Quyền riêng tư'],
  'Acceptable Use': ['Uso aceptable', 'Utilisation acceptable', 'Sử dụng hợp lệ'],
  'Careers': ['Empleo', 'Carrières', 'Tuyển dụng'],
  'What do you want to ask or share?': ['¿Qué quieres preguntar o compartir?', 'Que souhaitez-vous demander ou partager ?', 'Bạn muốn hỏi hoặc chia sẻ điều gì?'],
  'Ask': ['Preguntar', 'Demander', 'Hỏi'],
  'Answer': ['Responder', 'Répondre', 'Trả lời'],
  'Post': ['Publicar', 'Publier', 'Đăng bài'],
  'Advertisement': ['Publicidad', 'Publicité', 'Quảng cáo'],
  'Discover spaces': ['Descubrir espacios', 'Découvrir des espaces', 'Khám phá không gian'],
  'Language settings': ['Configuración de idioma', 'Paramètres de langue', 'Cài đặt ngôn ngữ'],
  'Your saved language is {language}. Select a language, then save your settings.': ['Tu idioma guardado es {language}. Selecciona un idioma y guarda la configuración.', 'Votre langue enregistrée est le {language}. Choisissez une langue, puis enregistrez vos paramètres.', 'Ngôn ngữ đã lưu là {language}. Chọn ngôn ngữ rồi lưu cài đặt.'],
  'Save language settings': ['Guardar configuración de idioma', 'Enregistrer la langue', 'Lưu cài đặt ngôn ngữ'],
  'English': ['inglés', 'anglais', 'Tiếng Anh'],
  'Spanish': ['español', 'espagnol', 'Tiếng Tây Ban Nha'],
  'French': ['francés', 'français', 'Tiếng Pháp'],
  'Vietnamese': ['vietnamita', 'vietnamien', 'Tiếng Việt'],
  '{language} (selected)': ['{language} (seleccionado)', '{language} (sélectionné)', '{language} (đã chọn)'],
  'Language saved: {language}.': ['Idioma guardado: {language}.', 'Langue enregistrée : {language}.', 'Đã lưu ngôn ngữ: {language}.'],
  'Questions worth exploring': ['Preguntas que vale la pena explorar', 'Des questions à découvrir', 'Những câu hỏi đáng khám phá'],
  'Community discussion': ['Conversación de la comunidad', 'Discussion de la communauté', 'Thảo luận cộng đồng'],
  'Your saved posts': ['Tus publicaciones guardadas', 'Vos publications enregistrées', 'Bài viết bạn đã lưu'],
  'Ask the community': ['Pregunta a la comunidad', 'Interroger la communauté', 'Hỏi cộng đồng'],
  'All questions, answers, and profiles are fictional demo content.': ['Las preguntas, respuestas y perfiles son contenido ficticio de demostración.', 'Les questions, réponses et profils sont des contenus fictifs de démonstration.', 'Mọi câu hỏi, câu trả lời và hồ sơ đều là nội dung minh họa hư cấu.'],
  'Question title': ['Título de la pregunta', 'Titre de la question', 'Tiêu đề câu hỏi'],
  'Question topic': ['Tema de la pregunta', 'Sujet de la question', 'Chủ đề câu hỏi'],
  'Question details': ['Detalles de la pregunta', 'Détails de la question', 'Chi tiết câu hỏi'],
  'Publish demo question': ['Publicar pregunta de demostración', 'Publier la question de démonstration', 'Đăng câu hỏi minh họa'],
  'Read post: {title}': ['Leer publicación: {title}', 'Lire la publication : {title}', 'Đọc bài viết: {title}'],
  'Upvote': ['Votar a favor', 'Voter pour', 'Bình chọn'],
  'Upvote (saved)': ['Voto registrado', 'Vote enregistré', 'Đã bình chọn'],
  'Save this post': ['Guardar esta publicación', 'Enregistrer cette publication', 'Lưu bài viết này'],
  'Unsave this post': ['Quitar de guardados', 'Retirer des publications enregistrées', 'Bỏ lưu bài viết này'],
  'Upvote answer by {author} ({votes})': ['Votar por la respuesta de {author} ({votes})', 'Voter pour la réponse de {author} ({votes})', 'Bình chọn câu trả lời của {author} ({votes})'],
  "Comment on {author}'s answer": ['Comentar la respuesta de {author}', 'Commenter la réponse de {author}', 'Bình luận câu trả lời của {author}'],
  "Post comment on {author}'s answer": ['Publicar comentario en la respuesta de {author}', 'Publier un commentaire sur la réponse de {author}', 'Đăng bình luận cho câu trả lời của {author}'],
  'Write your answer': ['Escribe tu respuesta', 'Rédigez votre réponse', 'Viết câu trả lời của bạn'],
  'Publish demo answer': ['Publicar respuesta de demostración', 'Publier la réponse de démonstration', 'Đăng câu trả lời minh họa'],
  'No saved posts yet.': ['Todavía no hay publicaciones guardadas.', 'Aucune publication enregistrée pour le moment.', 'Chưa có bài viết nào được lưu.'],
  'No posts match your search. Try gardening, programming, cooking, or travel.': ['No hay resultados. Prueba con jardinería, programación, cocina o viajes.', 'Aucun résultat. Essayez jardinage, programmation, cuisine ou voyage.', 'Không có bài viết phù hợp. Hãy thử làm vườn, lập trình, nấu ăn hoặc du lịch.'],
  'Browse {topic}': ['Explorar {topic}', 'Explorer {topic}', 'Khám phá {topic}'],
  'Follow {topic}': ['Seguir {topic}', 'Suivre {topic}', 'Theo dõi {topic}'],
  'Unfollow {topic}': ['Dejar de seguir {topic}', 'Ne plus suivre {topic}', 'Bỏ theo dõi {topic}'],
  'Gardening': ['Jardinería', 'Jardinage', 'Làm vườn'],
  'Programming': ['Programación', 'Programmation', 'Lập trình'],
  'Everyday life': ['Vida cotidiana', 'Vie quotidienne', 'Đời sống hằng ngày'],
  'Travel': ['Viajes', 'Voyage', 'Du lịch'],
  'Design': ['Diseño', 'Design', 'Thiết kế'],
  'Science': ['Ciencia', 'Sciences', 'Khoa học'],
  '{count} answers': ['{count} respuestas', '{count} réponses', '{count} câu trả lời'],
  'You (demo)': ['Tú (demo)', 'Vous (démo)', 'Bạn (minh họa)'],
  'Demo community member': ['Miembro de la comunidad de demostración', 'Membre de la communauté de démonstration', 'Thành viên cộng đồng minh họa'],
  'fictional demo profile': ['perfil ficticio de demostración', 'profil fictif de démonstration', 'hồ sơ minh họa hư cấu'],
  'Container gardener': ['Especialista en jardinería en macetas', 'Jardinage en pots', 'Người trồng cây trong chậu'],
  'Backyard fruit grower': ['Cultivador de frutales', 'Culture fruitière au jardin', 'Người trồng cây ăn quả tại nhà'],
  'Frontend developer': ['Desarrolladora frontend', 'Développement frontend', 'Lập trình viên giao diện'],
  'Builds web tools': ['Crea herramientas web', 'Création d’outils web', 'Phát triển công cụ web'],
  'Enjoys simple routines': ['Amante de las rutinas sencillas', 'Aime les routines simples', 'Yêu thích lối sống đơn giản'],
  'Remote worker': ['Trabajador a distancia', 'Télétravail', 'Người làm việc từ xa'],
  'Frequent rail traveler': ['Viajero habitual en tren', 'Voyageur régulier en train', 'Người thường xuyên đi tàu'],
  'Occasional traveler': ['Viajero ocasional', 'Voyageur occasionnel', 'Người thỉnh thoảng du lịch'],
  'Home baker': ['Panadera aficionada', 'Boulangerie maison', 'Người làm bánh tại nhà'],
  'Weekend cook': ['Cocinero aficionado', 'Cuisine du week-end', 'Người nấu ăn cuối tuần'],
  'Product researcher': ['Investigadora de producto', 'Recherche produit', 'Nhà nghiên cứu sản phẩm'],
  'Science enthusiast': ['Aficionado a la ciencia', 'Passionné de sciences', 'Người yêu khoa học'],
  'Amateur photographer': ['Fotógrafa aficionada', 'Photographe amateur', 'Nhiếp ảnh gia nghiệp dư'],
  'Vote updated.': ['Voto actualizado.', 'Vote mis à jour.', 'Đã cập nhật bình chọn.'],
  'Answer vote updated.': ['Voto de la respuesta actualizado.', 'Vote sur la réponse mis à jour.', 'Đã cập nhật bình chọn câu trả lời.'],
  'Saved posts updated.': ['Publicaciones guardadas actualizadas.', 'Publications enregistrées mises à jour.', 'Đã cập nhật bài viết đã lưu.'],
  'Followed topics updated.': ['Temas seguidos actualizados.', 'Sujets suivis mis à jour.', 'Đã cập nhật chủ đề đang theo dõi.'],
  'Your demo question was published.': ['Tu pregunta de demostración se ha publicado.', 'Votre question de démonstration a été publiée.', 'Đã đăng câu hỏi minh họa của bạn.'],
  'Your demo answer was published.': ['Tu respuesta de demostración se ha publicado.', 'Votre réponse de démonstration a été publiée.', 'Đã đăng câu trả lời minh họa của bạn.'],
  'Your demo comment was posted.': ['Tu comentario de demostración se ha publicado.', 'Votre commentaire de démonstration a été publié.', 'Đã đăng bình luận minh họa của bạn.'],
  'Write a comment before posting.': ['Escribe un comentario antes de publicarlo.', 'Rédigez un commentaire avant de le publier.', 'Hãy viết bình luận trước khi đăng.'],
  'Write at least 10 characters before publishing your answer.': ['Escribe al menos 10 caracteres antes de publicar tu respuesta.', 'Rédigez au moins 10 caractères avant de publier votre réponse.', 'Viết ít nhất 10 ký tự trước khi đăng câu trả lời.'],
  'Add a question title (8+ characters), details (10+ characters), and a topic.': ['Añade un título (8 caracteres como mínimo), detalles (10 caracteres como mínimo) y un tema.', 'Ajoutez un titre (8 caractères minimum), des détails (10 caractères minimum) et un sujet.', 'Thêm tiêu đề (ít nhất 8 ký tự), chi tiết (ít nhất 10 ký tự) và chủ đề.'],
  'Search results for “{query}”.': ['Resultados de búsqueda para «{query}».', 'Résultats de recherche pour « {query} ».', 'Kết quả tìm kiếm cho “{query}”.'],
  'all': ['todo', 'tout', 'tất cả'],
  'Quora-style community · fictional isolated demo. No real accounts, purchases, or payments.': ['Comunidad de estilo Quora · demostración ficticia y aislada. Sin cuentas, compras ni pagos reales.', 'Communauté de style Quora · démonstration fictive et isolée. Aucun compte, achat ou paiement réel.', 'Cộng đồng kiểu Quora · môi trường minh họa hư cấu. Không có tài khoản, mua hàng hay thanh toán thật.'],
};
const LANGUAGE_STORAGE_KEY = 'pageguide.quora-language.v1';
export function readQuoraLanguage(): string {
  try { const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY); return ['English', 'Spanish', 'French', 'Vietnamese'].includes(saved || '') ? saved! : 'English'; } catch { return 'English'; }
}
export function saveQuoraLanguage(language: string) {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* In-memory preferences still work when storage is unavailable. */ }
}
export const quoraLocale = (language: string) => (({ Spanish: 'es', French: 'fr', Vietnamese: 'vi' } as Record<string, string>)[language] || 'en');
export function qt(language: string, key: string, values: Record<string, string | number> = {}): string {
  const index = ['Spanish', 'French', 'Vietnamese'].indexOf(language);
  const template = index < 0 ? key : UI[key]?.[index] || key;
  return template.replace(/\{(\w+)\}/g, (all, name) => String(values[name] ?? all));
}
export function localizeQuoraPost(p: Post, language: string): Post {
  const content = QUORA_CONTENT[language]?.[p.id];
  if (!content) return p;
  return { ...p, title: content[0], body: content[1], answers: p.answers?.map((a, i) => ({ ...a, text: content[2 + i] || a.text, comments: a.comments.map((c, j) => ({ ...c, text: content[4 + i * 2 + j] || c.text })) })) };
}
export function canonicalQuoraTopic(value: string): string {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return ['Gardening', 'Programming', 'Everyday life', 'Travel', 'Cooking', 'Design', 'Science'].find(topic => normalize(topic) === normalize(value) || (UI[topic] || []).some(v => normalize(v) === normalize(value))) || value;
}
export function localizeQuoraBlock(b: Block, language: string, draftLanguage: string): Block {
  const t = (key: string, values?: Record<string, string | number>) => qt(language, key, values);
  let text = t(b.text);
  if (b.id === 'language-current') text = t('Your saved language is {language}. Select a language, then save your settings.', { language: t(language) });
  else if (b.id.startsWith('language-')) {
    const name = ['English', 'Spanish', 'French', 'Vietnamese'].find(l => `language-${l.toLowerCase()}` === b.id);
    if (name) { const label = t(name).replace(/^./u, c => c.toLocaleUpperCase()); text = draftLanguage === name ? t('{language} (selected)', { language: label }) : label; }
  } else if (b.id === 'notice' && b.text.startsWith('Language saved: ')) text = t('Language saved: {language}.', { language: t(language) });
  else if (b.id === 'notice' && b.text.startsWith('Search results for “')) text = t('Search results for “{query}”.', { query: b.text.slice(20, -2) === 'all' ? t('all') : b.text.slice(20, -2) });
  else if (b.id.startsWith('post-') && b.type === 'button') text = t('Read post: {title}', { title: b.text.slice(11) });
  else if (b.id.startsWith('topic-')) text = t('Browse {topic}', { topic: t(b.text.slice(7)) });
  else if (b.id.startsWith('follow-')) text = t(b.text.startsWith('Unfollow ') ? 'Unfollow {topic}' : 'Follow {topic}', { topic: t(b.text.replace(/^(Unfollow|Follow) /, '')) });
  else if (b.id.startsWith('author-')) text = b.text.split(' · ').map(part => /^\d+ answers$/.test(part) ? t('{count} answers', { count: part.split(' ')[0] }) : t(part)).join(' · ');
  else if (b.id.startsWith('answer-credential-')) text = b.text.split(' · ').map(part => t(part)).join(' · ');
  else if (b.id.startsWith('vote-answer-')) {
    const match = /^Upvote answer by (.+) \((\d+)\)$/.exec(b.text);
    if (match) text = t('Upvote answer by {author} ({votes})', { author: t(match[1]), votes: match[2] });
  } else if (b.id.startsWith('comment-input-') || b.id.startsWith('submit-comment-')) {
    const match = /^(?:Post comment on|Comment on) (.+)'s answer$/.exec(b.text);
    if (match) text = t(b.id.startsWith('comment-input-') ? "Comment on {author}'s answer" : "Post comment on {author}'s answer", { author: t(match[1]) });
  } else if (b.id.startsWith('comment-') && b.text.startsWith('You (demo):')) text = `${t('You (demo)')}${b.text.slice(10)}`;
  return { ...b, text, ...(b.id === 'question-topic' && b.value ? { value: t(b.value) } : {}) };
}
