# Fazenda Viva 0.9.9.13 — manejo confiável e circulação livre

As capturas do usuário mostraram cuidado em 15/100 no dia 606 e sobreposição da cabeça do cavalo com o tratador. Esta entrega corrige chegada, cadência e acesso ao manejo antes da próxima revisão de paisagem.

## Mudanças

- Economia, cavalos e trabalhadores usam passos fixos de 1/30 segundo simulado em 1×, 3× e 8×, acumulando os intervalos de quadros. Evita tempos de cuidado diferentes conforme a cadência de renderização.
- A última etapa do caminho de manejo usa chegada precisa; o tratador inicia o atendimento apenas com o cavalo parado no ponto físico de encontro e a menos de 3,8 unidades.
- Pontos de encontro evitam outros trabalhadores, inclusive destinos reservados; o tratador aguarda acesso em vez de abandonar o paciente por outra tarefa.
- Alimentação abaixa a cabeça e reposiciona o tratador ao lado do focinho. Geometria compartilhada em Canvas/Three.js.
- O bloqueio da porteira considera apenas travessias atuais. Cavalos atendidos aguardam retorno pelo vão antes de retomar o pastoreio.
- Encontros em corredores estreitos escolhem desvios que aumentam a separação, com deslocamento limitado ao passo; não teletransportam animais. Destinos de trabalho evitam a concentração de funcionários no mesmo lugar.

## Verificação

Regressões locais aprovadas de rotina, terreno, áudio, simulação, cuidado, renderizador, movimento e geometria Three.js.

Quatro cenários equivalentes até o dia 866: 60 FPS/8×, quadros variáveis/8×, 30 FPS/3× e quadros variáveis/1×. Todos mantiveram cuidado próprio mínimo 59/100, com 7 e 6 serviços nos dois cavalos iniciais e espera máxima pelo tratador de aproximadamente 32 segundos simulados.

Simulação completa das cinco propriedades até o dia 1.236: 987 tarefas, 37 instalações atendidas, 122 passagens pela porteira, 77 excursões, cuidado próprio mínimo 59/100 e zero interseções de caminhos com edificações. Maior bloqueio por encontro: 6,8 segundos simulados. Regressão exige atendimento contínuo de todos os cavalos iniciais nas cinco fazendas.

Geometria verifica o focinho fora do volume do chapéu no atendimento e preserva contato com o solo, adultos, potros e os sinais de trabalho. Testes adicionais reproduzem a chegada interrompida antes do paciente, encontro ocupado e desvio em corredor estreito.

Chromium/WebGL2 por software passou nos cinco viewports: 390×844, 320×568, 360×640, 844×390 e 1365×900. Controles, toque, alternância 2D/3D, Contemplar, recuperação de contexto e tarefas naturais aprovados; zero erros JavaScript/shader. O navegador registrou 20 instalações e 15 trabalhadores com serviços, e uma alimentação natural com distância tratador/paciente de 3,616 unidades.

Capturas de alimentação em 2D e 3D, cena inicial, personagens e pastoreio inspecionadas. O focinho está separado do chapéu; o atendimento acontece lateralmente e o cavalo abaixa a cabeça. A arte permanece estilizada e a aprovação artística continua aberta.

Cena inicial 390×844: 166 chamadas e 148.921 triângulos, iguais à referência 0.9.9.12. A cadência registrada no renderer por software não mede FPS Android. Evidências completas no [workflow #153](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38197364486), código verificado `f041d6c49f198d30f9615c9ba5388fd9c2bf0317`. Apenas documentação foi alterada após essa revisão.

## Limites e próxima direção

Os números acima são resultados determinísticos dos cenários testados, não uma garantia para toda configuração de plantel e obras. Qualidade artística dos cavalos, áudio e desempenho/temperatura em Android físico continuam pendentes.

A próxima revisão visual deve aplicar a direção aprovada das referências Farm Manager: setores rurais legíveis, pastagem/feno em mosaico, vegetação agrupada, margens naturais e núcleo de instalações coerente, adaptados à identidade da cabanha brasileira. Essa paisagem ainda não faz parte da 0.9.9.13.
