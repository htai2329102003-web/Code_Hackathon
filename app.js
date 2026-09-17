'use strict';
const $ = (selector) => document.querySelector(selector);
const slides = {
  intro: {day:'Day 03', title:'Chatbot vs ReAct Agent', page:1, subtitle:'Lab Guideline'},
  embedding: {day:'Day 03 · Embedding & Vector Search', title:'Embedding là gì?', page:12, description:'Embedding là cách biểu diễn dữ liệu dưới dạng vector — một dãy số giúp máy tính xử lý và so sánh ý nghĩa.', example:['“mèo”','→','[0.2, 0.8, 0.1, …]'], caption:'Các khái niệm có ý nghĩa gần nhau thường có vector gần nhau.'},
  rag: {day:'Day 04 · Retrieval Augmented Generation', title:'Tìm kiếm bằng vector', page:7, description:'Vector embedding được sử dụng để truy xuất những đoạn nội dung có ý nghĩa gần với câu hỏi.', example:['Câu hỏi','→','Nội dung liên quan'], caption:'RAG kết hợp nội dung được truy xuất với câu trả lời của mô hình.'},
  data: {day:'Day 02 · Biểu diễn dữ liệu', title:'Từ dữ liệu đến vector', page:15, description:'Các phương pháp embedding chuyển văn bản, hình ảnh hoặc âm thanh thành những dãy số để máy tính so sánh.', example:['Văn bản','→','Vector'], caption:'Ví dụ minh họa: “mèo” và “chó” gần nhau hơn “mèo” và “ô tô”.'}
};
let currentKey = 'intro', currentPage = 1, zoom = 100, selectedText = '';
let selectedMessage = null, pendingExplanation = null;
// Synthetic lesson material, not official/private hackathon data.
const courseContexts = {
  intro: 'Bài học giới thiệu chatbot và ReAct Agent. Chưa có định nghĩa về embedding trong phần này.',
  embedding: 'Embedding biểu diễn dữ liệu bằng một vector, tức một dãy số. Mỗi chiều là một thành phần số trong vector. Không gian nhiều chiều có nhiều thành phần để biểu diễn dữ liệu, không chỉ hai hay ba chiều vật lý. Các vector có thể được so sánh để tìm quan hệ về ý nghĩa. Trong ví dụ bài học, “mèo” và “chó” có ý nghĩa gần nhau hơn “mèo” và “ô tô”. Không phải mỗi chiều luôn ứng với một đặc điểm mà con người có thể gọi tên.',
  rag: 'RAG truy xuất những đoạn nội dung có ý nghĩa liên quan đến câu hỏi rồi dùng nội dung đó để hỗ trợ câu trả lời. Vector embedding được dùng để so sánh mức độ liên quan khi truy xuất. Phần này không giải thích cấu trúc của vector hay không gian nhiều chiều.',
  data: 'Embedding chuyển văn bản, hình ảnh hoặc âm thanh thành một vector — một dãy số. Mỗi chiều là một thành phần của dãy số. Biểu diễn nhiều chiều cho phép so sánh quan hệ giữa các dữ liệu. Những dữ liệu có ý nghĩa gần nhau thường được biểu diễn bởi vector gần nhau.'
};
const answer = 'Embedding là cách biểu diễn dữ liệu dưới dạng <span class="target-phrase" tabindex="0" role="button" aria-label="Chọn cụm từ vector trong không gian nhiều chiều">vector trong không gian nhiều chiều</span> để máy tính có thể xử lý và so sánh quan hệ giữa các đối tượng.';
function renderSlide(key, page = slides[key].page) {
  currentKey = key; currentPage = page; zoom = 100;
  const s = slides[key];
  $('#slide-viewer').innerHTML = `<span class="slide-badge" aria-hidden="true">✧</span><div class="slide-inner ${key === 'intro' ? 'title-slide' : 'content-slide'}"><p class="slide-kicker">${s.day}</p><h2>${s.title}</h2>${s.subtitle ? `<p class="slide-subtitle">${s.subtitle}</p>` : `<p class="slide-description">${s.description}</p><div class="vector-example"><span>${s.example[0]}</span>${s.example[1]}<span>${s.example[2]}</span></div><p class="vector-caption">${s.caption}</p>`}<small class="slide-footnote">VLearn · Tài liệu minh họa CP2 · Nội dung giả lập</small></div>`;
  $('#slide-number').textContent = page; $('#zoom-label').textContent = '100%';
  $('#prev-slide').disabled = page === 1; $('#next-slide').disabled = page === 20;
  $('#lecturer-note').textContent = key === 'intro' ? 'Chưa có ghi chú cho phần này.' : 'Nội dung minh họa: ' + (s.caption || s.title);
  const context = $('.context-label'); if (context) context.textContent = `Đang mở: ${s.day} · slide ${page}`;
}
function closeSearch() { $('#search-results').hidden = true; $('#lesson-list').hidden = false; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character])); }
function renderSearchResult(result) {
  currentKey = 'embedding'; currentPage = result.page; zoom = 100;
  courseContexts.embedding = result.text;
  const pdfUrl = `/api/slides/${encodeURIComponent(result.file)}#page=${result.page}&zoom=page-width`;
  $('#slide-viewer').innerHTML = `<iframe class="pdf-slide" src="${pdfUrl}" title="${escapeHtml(result.file)} · trang ${result.page}" loading="eager"></iframe>`;
  $('#slide-number').textContent = result.page; $('#zoom-label').textContent = '100%';
  $('#prev-slide').disabled = result.page === 1; $('#next-slide').disabled = result.page === 29;
  $('#lecturer-note').textContent = `Đã mở trang ${result.page} từ ${result.file}.`;
  const context = $('.context-label'); if (context) context.textContent = `Đang mở: ${result.file} · trang ${result.page}`;
}
$('#search-form').addEventListener('submit', async event => {
  event.preventDefault();
  const query = $('#search-input').value.trim().toLowerCase();
  if (!query) { closeSearch(); return; }
  $('#lesson-list').hidden = true; $('#search-results').hidden = false;
  $('#search-results').innerHTML = '<p class="empty-state">Đang tìm trong 2 file PDF thật…</p>';
  try {
    const response = await fetch('/api/search', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không tìm được slide.');
    const results = data.results || [];
    $('#search-results').innerHTML = `<div class="results-heading"><span>${results.length} kết quả · ${escapeHtml(data.mode === 'semantic' ? 'AI semantic search' : 'keyword fallback')}</span><button id="close-search">Đóng ×</button></div>` + (results.length ? results.map((result, index) => `<article class="result-card"><h3>${escapeHtml(result.lesson)}</h3><span class="slide-ref">${escapeHtml(result.file)} · trang ${result.page}</span><p>${escapeHtml(result.snippet)}</p><button data-result-index="${index}">Mở trang <span aria-hidden="true">↗</span></button></article>`).join('') : '<p class="empty-state">Chưa tìm thấy trang phù hợp trong hai PDF.</p>');
    $('#close-search').onclick = closeSearch;
    document.querySelectorAll('[data-result-index]').forEach(button => button.onclick = () => {renderSearchResult(results[Number(button.dataset.resultIndex)]);closeSearch();$('#search-input').value = '';$('#slide-viewer').setAttribute('tabindex','-1');$('#slide-viewer').focus({preventScroll:true});});
  } catch (error) {
    $('#search-results').innerHTML = `<div class="results-heading"><span>Kết quả tìm kiếm</span><button id="close-search">Đóng ×</button></div><p class="empty-state">${escapeHtml(error.message)}</p>`;
    $('#close-search').onclick = closeSearch;
  }
});
$('#search-input').addEventListener('input', () => {if (!$('#search-input').value.trim()) closeSearch();});
$('#slides-toggle').onclick = () => { const collapsed = !$('#slide-items').hidden; $('#slide-items').hidden = collapsed; $('#slides-toggle').setAttribute('aria-expanded',String(!collapsed)); };
document.querySelectorAll('[data-slide]').forEach(button => button.onclick = () => {document.querySelectorAll('.lesson-item').forEach(b=>b.classList.remove('active'));button.classList.add('active');renderSlide(button.dataset.slide);});
function changePage(delta) {const page = Math.max(1,Math.min(20,currentPage + delta));renderSlide(page === 1 ? 'intro' : 'embedding',page);}
$('#prev-slide').onclick = () => changePage(-1); $('#next-slide').onclick = () => changePage(1);
$('#previous-lesson').onclick = () => renderSlide('data'); $('#next-lesson').onclick = () => renderSlide('rag');
function changeZoom(delta) {zoom = Math.max(75,Math.min(150,zoom+delta));const slideInner = $('.slide-inner');const pdfSlide = $('.pdf-slide');if (slideInner) slideInner.style.transform = `scale(${zoom/100})`;if (pdfSlide) pdfSlide.style.transform = `scale(${zoom/100})`;$('#zoom-label').textContent = zoom+'%';}
$('#zoom-out').onclick = () => changeZoom(-10); $('#zoom-in').onclick = () => changeZoom(10);
function toggleNotes() {$('#personal-note').hidden = !$('#personal-note').hidden;if (!$('#personal-note').hidden) $('#personal-note').focus();}
$('#note-button').onclick = toggleNotes; $('#notebook').onclick = toggleNotes;
document.querySelectorAll('.feedback button').forEach(button => button.onclick = () => {button.classList.toggle('selected');button.setAttribute('aria-pressed',button.classList.contains('selected'));$('#feedback-status').textContent = 'Đã ghi nhận trong phiên demo.';});
function appendUser(text) { const node = document.createElement('div');node.className = 'message user';node.textContent = text;$('#conversation').append(node); }
function appendAssistant(html, extra = '') {
  const node = document.createElement('div');node.className = 'message assistant '+extra;
  node.innerHTML = '<div class="message-label"><span aria-hidden="true">✦</span> Trợ giảng AI</div>'+html;
  const questions = document.querySelectorAll('.message.user');
  node.dataset.originalQuestion = questions.length ? questions[questions.length - 1].textContent : '';
  $('#conversation').append(node);return node;
}
function scrollChat() {$('#conversation').scrollTop = $('#conversation').scrollHeight;}
function initialChat() {
  $('#conversation').innerHTML = '<p class="context-label"></p>';
  $('.context-label').textContent = `Đang mở: ${slides[currentKey].day} · slide ${currentPage}`;
  appendUser('Embedding là gì vậy?');
  appendAssistant(`<p class="answer-text">${answer}</p><p class="selection-hint">Bôi đen một đoạn để hỏi thêm, hoặc nhấn vào cụm từ có gạch chân.</p>`);
  $('#conversation').scrollTop = 0;hideAction();
}
function hideAction() {$('#explain-selection').hidden = true;selectedText = '';selectedMessage = null;}
function showAction(text, rect, message) {
  if (!text.trim() || !rect || pendingExplanation) return;
  selectedText = text.trim();selectedMessage = message;const action = $('#explain-selection');action.hidden = false;
  action.style.left = Math.max(8,Math.min(window.innerWidth-action.offsetWidth-8,rect.left))+'px';
  action.style.top = Math.max(8,Math.min(window.innerHeight-action.offsetHeight-8,rect.top-action.offsetHeight-8))+'px';
}
function inspectSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return hideAction();
  const range = selection.getRangeAt(0);
  const start = range.startContainer.parentElement?.closest('.message.assistant');
  const end = range.endContainer.parentElement?.closest('.message.assistant');
  if (!start || start !== end) return hideAction();
  showAction(selection.toString(),range.getBoundingClientRect(), start);
}
$('#conversation').addEventListener('mouseup', () => setTimeout(inspectSelection,0));
$('#conversation').addEventListener('keyup', event => {if(event.key.startsWith('Arrow') || event.key === 'Shift') inspectSelection();});
function selectPhrase(target) {const range = document.createRange();range.selectNodeContents(target);const selection = window.getSelection();selection.removeAllRanges();selection.addRange(range);showAction(target.textContent,range.getBoundingClientRect(),target.closest('.message.assistant'));}
$('#conversation').addEventListener('click', event => {const target = event.target.closest('.target-phrase');if(target && window.getSelection().isCollapsed) selectPhrase(target);});
$('#conversation').addEventListener('keydown', event => {if(event.target.matches('.target-phrase') && ['Enter',' '].includes(event.key)){event.preventDefault();selectPhrase(event.target);}});
$('#explain-selection').addEventListener('mousedown', event => event.preventDefault());
$('#explain-selection').onclick = async () => {
  if (!selectedText || !selectedMessage || pendingExplanation) return;
  const originalAnswer = [...selectedMessage.querySelectorAll('p:not(.selection-hint)')].map(p => p.textContent).join('\n');
  const payload = {course_context: courseContexts[currentKey], original_question: selectedMessage.dataset.originalQuestion || '', original_answer: originalAnswer, selected_text: selectedText};
  if (!originalAnswer.includes(selectedText)) {hideAction();return;}
  const controller = new AbortController(); pendingExplanation = controller;
  const timeout = setTimeout(() => controller.abort(), 60000);
  const node = appendAssistant('<p>Đang giải thích đoạn bạn chọn…</p>', 'explanation');
  node.dataset.originalQuestion = payload.original_question;
  node.setAttribute('aria-busy','true');
  window.getSelection().removeAllRanges();hideAction();scrollChat();
  try {
    const response = await fetch('/api/explain', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), signal:controller.signal});
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không gọi được AI. Hãy thử lại.');
    const fields = {explain:'explanation', clarify:'question', no_grounding:'message', refuse:'message'};
    if (!Object.hasOwn(fields, data.action) || typeof data[fields[data.action]] !== 'string' || !data[fields[data.action]].trim()) throw new Error('Phản hồi AI không hợp lệ. Hãy thử lại.');
    if (!node.isConnected) return;
    node.querySelector('p').remove();
    const heading = document.createElement('h3');
    heading.textContent = {explain:'Giải thích đơn giản hơn',clarify:'Làm rõ đoạn được chọn',no_grounding:'Chưa đủ thông tin bài học',refuse:'Ngoài phạm vi giải thích'}[data.action];
    const content = document.createElement('p'); content.className = 'answer-text';
    content.style.whiteSpace = 'pre-wrap';content.textContent = data[fields[data.action]];
    node.append(heading,content);node.dataset.action = data.action;
  } catch (error) {
    if (node.isConnected) node.querySelector('p').textContent = error.name === 'AbortError' ? 'Yêu cầu đã dừng hoặc quá thời gian. Chọn lại đoạn văn bản để thử lại.' : error.message === 'Failed to fetch' ? 'Không kết nối được backend. Hãy kiểm tra máy chủ và thử lại.' : error.message;
  } finally {
    clearTimeout(timeout);node.removeAttribute('aria-busy');
    if (pendingExplanation === controller) pendingExplanation = null;
    if (node.isConnected) scrollChat();
  }
};
function cancelExplanation() {if (pendingExplanation) pendingExplanation.abort();pendingExplanation = null;hideAction();}
document.addEventListener('mousedown', event => {if(!event.target.closest('.message.assistant, #explain-selection')) hideAction();});
document.addEventListener('keydown', event => {if(event.key === 'Escape') hideAction();});
$('#conversation').addEventListener('scroll',hideAction);window.addEventListener('resize',hideAction);
$('#chat-input').addEventListener('input', () => {$('#send-message').disabled = !$('#chat-input').value.trim();});
$('#chat-input').addEventListener('keydown', event => {if(event.key === 'Enter' && !event.shiftKey){event.preventDefault();$('#chat-form').requestSubmit();}});
$('#chat-form').addEventListener('submit', event => {
  event.preventDefault();const text = $('#chat-input').value.trim();if(!text) return;
  appendUser(text);$('#chat-input').value='';$('#send-message').disabled=true;
  if(text.toLowerCase().replace(/[?!.,]/g,'').trim() === 'nó') appendAssistant('<p>Bạn đang muốn hỏi \'nó\' ám chỉ khái niệm nào?</p>');
  else if(/embedding|vector/i.test(text)) appendAssistant(`<p class="answer-text">${answer}</p>`);
  else appendAssistant('<p>Mình chưa có đủ thông tin trong bài học hiện tại để giải thích chính xác phần này.</p>');
  hideAction();scrollChat();
});
$('#new-chat').onclick = () => {cancelExplanation();$('#conversation').innerHTML='<p class="context-label">Cuộc trò chuyện mới · Hỏi về embedding để thử demo.</p>';hideAction();$('#chat-input').focus();};
$('#ask-ai').onclick = () => {$('#chat-input').focus();};
$('#reset-demo').onclick = () => {cancelExplanation();renderSlide('intro');closeSearch();$('#search-input').value='';$('#chat-input').value='';$('#send-message').disabled=true;initialChat();$('.lesson-center').scrollTop=0;};
const icon = paths => `<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const screenIcon = icon('<path d="M3 3h18v12H3zM12 15v5m-5 1 5-6 5 6"/>');
document.querySelectorAll('.slide-icon').forEach(el => el.innerHTML = screenIcon);
$('#note-button').innerHTML = icon('<path d="m15 4 5 5M4 20l4-1L21 6l-4-4L4 15zM12 20h9"/>');
$('.feedback button[aria-label="Hữu ích"]').innerHTML = icon('<path d="M7 10h-4v11h4zM7 20h11l3-10h-8l1-6c-1-3-3-1-3 1l-4 6"/>');
$('.feedback button[aria-label="Chưa hữu ích"]').innerHTML = icon('<path d="M7 14H3V3h4zM7 4h11l3 10h-8l1 6c-1 3-3 1-3-1l-4-6"/>');
$('.search-box button').innerHTML = icon('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>');
$('.lab-row>span').innerHTML = icon('<path d="M9 3h6m-5 0v7L5 20h14l-5-10V3M8 15h8"/>');
renderSlide('intro');initialChat();
