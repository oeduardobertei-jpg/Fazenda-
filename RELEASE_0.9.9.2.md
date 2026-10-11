# Fazenda Viva 0.9.9.2 — revisão adicional dos cavalos

## Motivo

Após jogar a 0.9.9.1 no Android, o usuário ainda não gostou dos cavalos em 3D e considerou que os fazendeiros melhoraram. Esta etapa prioriza novamente a anatomia equina; a ampliação das animações fica para depois da avaliação da nova aparência.

## Mudanças

- Pescoço mais curto, base muscular ligada ao peito e crista arqueada; cabeça mais encorpada, mandíbula, chanfro, focinho, narinas e boca definidos.
- Garupa larga, dorso menos tubular e cernelha sobre o ombro. Membros anteriores e posteriores possuem volumes distintos até as articulações e cascos.
- Crina, topete e lista branca seguem a superfície anatômica, sem faixas soltas. Cauda afilada e sombra de contato preservadas.
- Uma referência compartilhada de articulações posiciona as peças nos dois renderizadores e na prancha comparativa. A cabeça durante o pastoreio foi ajustada à nova anatomia.
- Mantidos os modelos dos fazendeiros, o manejo, a circulação, a economia, o comércio e partidas novas no dia 1.

## Verificação

- **Node local e CI:** `npm test` passou. Simulação até o dia 1.221, 64 estruturas, 15 trabalhadores, 810 tarefas e 91 excursões; zero interseções de caminhos com edifícios nas amostras. Regressões de cascos acima do solo, largura/altura da cabeça e toda a transição do focinho para o pasto. Casco mínimo y=0,420; focinho em pasto y≈0,685.
- **Chromium + WebGL2/SwiftShader:** testes passaram em 390×844, 320×568, 360×640, 844×390 e 1365×900. Alternância 2D/3D, toque/pinça, painéis, acompanhamento, pastoreio e recuperação de contexto cobertos; zero erros JavaScript. Commit de código validado: `1b980b8ffc2cb2a21c2f0821d13fcd260fdb1061`, [workflow](https://github.com/oeduardobertei-jpg/Fazenda-/actions/runs/38156208308).
- **Orçamento gráfico inicial, viewport 390×844:** 165→165 chamadas; 151.681→152.533 triângulos (+0,56%). FPS do renderizador por software não mede desempenho Android.
- **Inspeção visual:** comparação com 0.9.9.1 em perfil, frente e pasto, mais capturas dentro do jogo e Canvas. A primeira inspeção encontrou crina afastada do pescoço e lista branca interrompida; foram corrigidas e as novas capturas inspecionadas.
- **Ainda necessário:** avaliação da aparência pelo usuário e medição de desempenho/movimento no Android físico. A versão permanece estilizada e procedural; não declara a 1.0 concluída.
