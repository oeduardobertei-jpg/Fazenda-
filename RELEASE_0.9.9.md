# Fazenda Viva 0.9.9 — revisão equina e pastoreio

## Motivo
As capturas Android da 0.9.8 apontam linguagem pouco familiar (“gleba”), quatro bancas aparentemente vazias e cavalos pouco convincentes e restritos a órbitas de menos de um metro. O Centro Rural das três capturas é o mesmo local com eventos diferentes; suas funções econômicas já existiam em Gestão → Mercado.

## Entrega
Propriedade no guia; bancas com bens/comerciantes e toque direto para o mercado. Formas equinas compartilhadas pelos dois renderizadores, sem GLB externo nem texturas grandes. Rotina automática de piquete/campo/pasto/descanso/retorno dentro da fazenda, com caminhos planejados sob demanda, grades em cache e passagem individual pela porteira. Novas obras reservam o acesso, os pontos de manejo e corredores mais largos. O paisagismo não nasce sobre animais nem fecha a porteira. Animais novos e transferidos são posicionados antes da renderização. Construções não reinicializam todo o plantel.

O tratador prioriza pacientes pela necessidade de cuidado e pela área de manejo, inclusive quando estão longe no campo. Aguarda o retorno e só então pode concluir o atendimento e consumir uma porção de ração. Um cavalo no piquete espera o cuidado necessário antes de sair novamente. Cavalos esperam ou contornam outros animais em campo; em encontros estreitos, um deles cede espaço. A verificação contínua de segmentos corrige rotas que atravessavam pequenas quinas entre as amostras do planejador. Não há bônus financeiro artificial pelo passeio nem novas necessidades de NPCs.

## Verificação
- Automatizada: `npm test` passou localmente. A simulação alcançou o dia 1.221, com 64 estruturas, 15 trabalhadores e 810 tarefas; verificou 72 passagens pela porteira e 91 passeios completos com saída real ao campo e retorno. Distância mínima entre cavalos: 5,77 unidades; maior deslocamento observado por frame: 1,128 unidade. Cuidado mínimo do plantel próprio: 54,40/100; maior espera em encontros: 5,6 segundos simulados. Os cavalos iniciais das cinco fazendas ainda presentes receberam ao menos três cuidados. Verifica também limites, edifícios, cercas, exploração superior a 30 unidades por propriedade, quinas e conservação das transações. Poses, ciclo Three.js simulado e matrizes/buffers oficiais Three.js sem GPU passaram separadamente.
- Navegador: execução Chromium/WebGL e cinco viewports pelo workflow de QA; capturas incluem cavalo próximo, Centro Rural, Canvas e interface. Resultado e inspeção visual serão registrados após a execução.
- Android físico: as capturas recebidas são da 0.9.8. A naturalidade da 0.9.9 em movimento, sessão prolongada, FPS, calor e consumo ainda precisam de observação no dispositivo.

## Limites preservados
Modelo procedural estilizado; não é um rig de animação importado. Piquetes permanecem áreas de manejo; a liberdade acontece dentro dos limites da propriedade, sem invasão de lavouras externas, estradas públicas, açudes ou fazendas vizinhas. Venda externa remove o animal conforme a regra econômica existente; transferências regionais levam o mesmo indivíduo à fazenda compradora. O passeio não simula transporte rodoviário de animais.

Sem salvamento automático. Novas partidas começam no dia 1. Os critérios de lançamento da 1.0 seguem abertos.
