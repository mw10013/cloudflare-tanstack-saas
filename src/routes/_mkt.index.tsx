import { createFileRoute } from "@tanstack/react-router";
import { siGithub } from "simple-icons";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_mkt/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { sessionUser } = Route.useRouteContext();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-12">
      <div className="relative flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 border px-6 py-24">
        <span className="bg-primary absolute -top-2.25 left-0 h-5 w-px animate-pulse opacity-80" />
        <span className="bg-primary absolute top-0 -left-2.25 h-px w-5 animate-pulse opacity-80" />
        <span className="bg-primary absolute right-0 -bottom-2.25 h-5 w-px animate-pulse opacity-80" />
        <span className="bg-primary absolute -right-2.25 bottom-0 h-px w-5 animate-pulse opacity-80" />
        <span className="absolute top-0 right-0 size-24 rounded-tr-[9.4rem] border-t border-r opacity-80" />
        <span className="absolute top-0 left-0 size-24 rounded-tl-[9.4rem] border-t border-l opacity-80" />

        <span className="bg-secondary text-primary/90 mb-2 flex h-8 items-center rounded-full border px-3 py-1 text-sm font-medium">
          Production-Ready SaaS Template
        </span>
        <h1 className="text-center text-3xl leading-tight font-semibold text-wrap md:text-5xl">
          Launch in days, not months.
        </h1>
        <p className="text-muted-foreground max-w-xl text-center text-xl text-pretty md:text-2xl">
          Everything you need: authentication, subscriptions, team management,
          and edge infrastructure.
        </p>
        <div className="mt-6 flex w-fit gap-4">
          {sessionUser ? (
            <Button
              variant="default"
              className="h-11 rounded-full! px-6 text-base! font-medium"
              render={
                <a href={sessionUser.role === "admin" ? "/admin" : "/app"} />
              }
            >
              Go to Dashboard
            </Button>
          ) : (
            <Button
              variant="default"
              className="h-11 rounded-full! px-6 text-base! font-medium"
              render={<a href="/login" />}
            >
              Get Started
            </Button>
          )}
          <Button
            variant="outline"
            render={
              <a
                href="https://github.com/mw10013/tanstack-cloudflare-saas"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            className="h-11 rounded-full! text-base! font-medium"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d={siGithub.path} />
            </svg>
            Star on Github
          </Button>
        </div>
      </div>
      <div className="flex w-full flex-col items-center md:flex-row">
        <div className="group relative flex aspect-square h-full w-full flex-col items-center justify-center gap-4 overflow-hidden border-r border-l p-6">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--muted) 0px, var(--muted) 1px, transparent 1px, transparent 5px)",
            }}
          />
          <h1 className="text-center text-2xl leading-tight font-semibold text-wrap lg:text-3xl">
            TanStack Start
          </h1>
          <p className="text-center text-2xl leading-tight font-medium text-wrap lg:text-3xl">
            Next-gen meta-framework for high-performance full-stack web
            applications
          </p>
          <img
            src="/tanstack-circle-logo.png"
            alt="TanStack"
            className="absolute -bottom-20 size-40 grayscale transition-all group-hover:scale-105 group-hover:grayscale-0"
          />
          <svg
            viewBox="0 0 190 190"
            fill="none"
            className="absolute -bottom-20 hidden size-40 grayscale transition-all group-hover:scale-105 group-hover:grayscale-0"
          >
            <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
              <g>
                <path
                  d="M39.7239712,61.3436237 C36.631224,46.362877 35.9675112,34.8727722 37.9666331,26.5293551 C39.1555965,21.5671678 41.3293088,17.5190846 44.6346064,14.5984631 C48.1241394,11.5150478 52.5360327,10.0020122 57.493257,10.0020122 C65.6712013,10.0020122 74.2682602,13.7273214 83.4557246,20.8044264 C87.2031203,23.6910458 91.0924366,27.170411 95.1316515,31.2444746 C95.4531404,30.8310265 95.8165416,30.4410453 96.2214301,30.0806152 C107.64098,19.9149716 117.255245,13.5989272 125.478408,11.1636507 C130.367899,9.715636 134.958526,9.57768202 139.138936,10.983031 C143.551631,12.4664684 147.06766,15.5329489 149.548314,19.8281091 C153.642288,26.9166735 154.721918,36.2310983 153.195595,47.7320243 C152.573451,52.4199112 151.50985,57.5263831 150.007094,63.0593153 C150.574045,63.1277086 151.142416,63.2532808 151.705041,63.4395297 C166.193932,68.2358678 176.453582,73.3937462 182.665021,79.2882839 C186.360669,82.7953831 188.773972,86.6998434 189.646365,91.0218204 C190.567176,95.5836746 189.669313,100.159332 187.191548,104.451297 C183.105211,111.529614 175.591643,117.11221 164.887587,121.534031 C160.589552,123.309539 155.726579,124.917559 150.293259,126.363748 C150.541176,126.92292 150.733521,127.516759 150.862138,128.139758 C153.954886,143.120505 154.618598,154.61061 152.619477,162.954027 C151.430513,167.916214 149.256801,171.964297 145.951503,174.884919 C142.46197,177.968334 138.050077,179.48137 133.092853,179.48137 C124.914908,179.48137 116.31785,175.756061 107.130385,168.678956 C103.343104,165.761613 99.4108655,162.238839 95.3254337,158.108619 C94.9050753,158.765474 94.3889681,159.376011 93.7785699,159.919385 C82.3590198,170.085028 72.744755,176.401073 64.5215915,178.836349 C59.6321009,180.284364 55.0414736,180.422318 50.8610636,179.016969 C46.4483686,177.533532 42.9323404,174.467051 40.4516862,170.171891 C36.3577116,163.083327 35.2780823,153.768902 36.8044053,142.267976 C37.449038,137.410634 38.56762,132.103898 40.1575891,126.339009 C39.5361041,126.276104 38.9120754,125.976753 38.3380711,125.452242 C28.3599157,117.969812 21.2573378,110.332428 17.0303374,102.54009 C14.492137,98.0295848 13.2263464,93.528511 13.2263464,89.0368682 C13.2263464,84.5452254 14.492137,80.0439456 17.0303374,75.5330288 C21.2573378,67.740691 28.3599157,60.1033064 38.3380711,52.420876 C38.9120754,51.976753 39.5361041,51.6764016 40.1575891,51.6336065 C38.56762,45.8691945 37.449038,40.5614953 36.8044053,35.7035082 C35.2780823,24.2017718 36.3577116,14.8872182 40.4516862,7.79707834 C42.9323404,3.50186979 46.4483686,0.435388642 50.8610636,-1.04804754 C55.0414736,-2.45339654 59.6321009,-2.31544257 64.5215915,-0.867427879 C72.744755,1.5678486 82.3590198,7.88389299 93.7785699,18.0495368 C94.3889681,18.5929103 94.9050753,19.2034472 95.3254337,19.8603022 C99.4108655,15.7290816 103.343104,12.2069215 107.130385,9.28996587 C116.31785,2.21286091 124.914908,-1.51244822 133.092853,-1.51244822 C138.050077,-1.51244822 142.46197,0.00058782553 145.951503,3.08400308 C149.256801,6.00462465 151.430513,10.0527078 152.619477,15.0148951 C154.618598,23.3583122 153.954886,34.848417 150.862138,49.8291636 C150.733521,50.4511809 150.541176,51.0450193 150.293259,51.6041917 C155.726579,53.0503805 160.589552,54.6584004 164.887587,56.4339081 C175.591643,60.8557297 183.105211,66.4383252 187.191548,73.5166424 C189.669313,77.8086075 190.567176,82.3842645 189.646365,86.9461187 C188.773972,91.2680958 186.360669,95.1725561 182.665021,98.6796553 C176.453582,104.574193 166.193932,109.731071 151.705041,114.527409 C151.142416,114.713658 150.574045,114.83923 150.007094,114.907624 C151.50985,120.440556 152.573451,125.547028 153.195595,130.234915 C154.721918,141.735841 153.642288,151.050266 149.548314,158.13883 C147.06766,162.43399 143.551631,165.500471 139.138936,166.983908 C134.958526,168.389257 130.367899,168.251303 125.478408,166.803288 C117.255245,164.368012 107.64098,158.052 - 96.2214301,147.886357 C95.8165416,147.525927 95.4531404,147.135946 95.1316515,146.722498 C91.0924366,150.796562 87.2031203,154.275927 83.4557246,157.162547 C74.2682602,164.239652 65.6712013,167.964961 57.493257,167.964961 C52.5360327,167.964961 48.1241394,166.451925 44.6346064,163.36851 C41.3293088,160.447888 39.1555965,156.399805 37.9666331,151.437618 C35.9675112,143.094201 36.631224,131.604096 39.7239712,116.623349 C39.8461172,116.041221 40.0235791,115.478092 40.2523565,114.939343 C36.6806768,114.09482 33.2603593,112.985944 30.0048319,111.622824 C17.4026104,106.352191 8.79862369,99.7848483 4.19225297,91.9213486 C1.56463607,87.3594943 0.370444315,82.7121711 0.370444315,78.013379 C0.370444315,73.3145868 1.56463607,68.6672636 4.19225297,64.1054093 C8.79862369,56.2419096 17.4026104,49.6745667 30.0048319,44.4039336 C33.2603593,43.0408123 36.6806768,41.9319366 40.2523565,41.0874143 C40.0235791,40.5486652 39.8461172,39.9855355 39.7239712,39.4034084 L39.7239712,39.4034084 Z"
                  fill="#FF2056"
                />
                <path
                  d="M80.3968824,64 L109.608177,64 C111.399254,64 113.053521,64.958025 113.944933,66.5115174 L128.577138,92.0115174 C129.461464,93.5526583 129.461464,95.4473417 128.577138,96.9884826 L113.944933,122.488483 C113.053521,124.041975 111.399254,125 109.608177,125 L80.3968824,125 C78.6058059,125 76.9515387,124.041975 76.0601262,122.488483 L61.4279211,96.9884826 C60.543596,95.4473417 60.543596,93.5526583 61.4279211,92.0115174 L76.0601262,66.5115174 C76.9515387,64.958025 78.6058059,64 80.3968824,64 Z M105.987827,70.2765273 C107.779849,70.2765273 109.434839,71.2355558 110.325899,72.7903404 L121.343038,92.0138131 C122.225607,93.5537825 122.225607,95.4462175 121.343038,96.9861869 L110.325899,116.20966 C109.434839,117.764444 107.779849,118.723473 105.987827,118.723473 L84.0172329,118.723473 C82.2252106,118.723473 80.5702207,117.764444 79.6791602,116.20966 L68.6620219,96.9861869 C67.7794521,95.4462175 67.7794521,93.5537825 68.6620219,92.0138131 L79.6791602,72.7903404 C80.5702207,71.2355558 82.2252106,70.2765273 84.0172329,70.2765273 L105.987827,70.2765273 Z M102.080648,77.1414791 L87.9244113,77.1414791 C86.1342282,77.1414791 84.4806439,78.0985567 83.5888998,79.6508285 L83.5888998,79.6508285 L76.4892166,92.0093494 C75.6032319,93.5515958 75.6032319,95.4484042 76.4892166,96.9906506 L76.4892166,96.9906506 L83.5888998,109.349172 C84.4806439,110.901443 86.1342282,111.858521 87.9244113,111.858521 L87.9244113,111.858521 L102.080648,111.858521 C103.870831,111.858521 105.524416,110.901443 106.41616,109.349172 L106.41616,109.349172 L113.515843,96.9906506 C114.401828,95.4484042 114.401828,93.5515958 113.515843,92.0093494 L113.515843,92.0093494 L106.41616,79.6508285 C105.524416,78.0985567 103.870831,77.1414791 102.080648,77.1414791 L102.080648,77.1414791 Z M98.3191856,83.7122186 C100.108028,83.7122186 101.760587,84.6678753 102.652827,86.2183156 L105.983552,92.0060969 C106.87203,93.5500005 106.87203,95.4499995 105.983552,96.9939031 L102.652827,102.781684 C101.760587,104.332125 100.108028,105.287781 98.3191856,105.287781 L91.6808144,105.287781 C89.891972,105.287781 88.239413,104.332125 87.3471731,102.781684 L84.0164478,96.9939031 C83.1279697,95.4499995 83.1279697,93.5500005 84.0164478,92.0060969 L87.3471731,86.2183156 C88.239413,84.6678753 89.891972,83.7122186 91.6808144,83.7122186 L98.3191856,83.7122186 Z"
                  fill="#FFD94C"
                />
                <path
                  d="M54.8601729,108.357758 C56.1715224,107.608286 57.8360246,108.074601 58.5779424,109.399303 L58.5779424,109.399303 L59.0525843,110.24352 C62.8563392,116.982993 66.8190116,123.380176 70.9406016,129.435068 C75.8078808,136.585427 81.28184,143.82411 87.3624792,151.151115 C88.3168778,152.30114 88.1849437,154.011176 87.065686,154.997937 L87.065686,154.997937 L86.4542085,155.534625 C66.3465389,173.103314 53.2778188,176.612552 47.2480482,166.062341 C41.3500652,155.742717 43.4844915,136.982888 53.6513274,109.782853 C53.876818,109.179582 54.3045861,108.675291 54.8601729,108.357758 Z M140.534177,129.041504 C141.986131,128.785177 143.375496,129.742138 143.65963,131.194242 L143.65963,131.194242 L143.812815,131.986376 C148.782365,157.995459 145.283348,171 133.315764,171 C121.609745,171 106.708724,159.909007 88.6127018,137.727022 C88.2113495,137.235047 87.9945723,136.617371 88,135.981509 C88.013158,134.480686 89.2357854,133.274651 90.730918,133.287756 L90.730918,133.287756 L91.6846544,133.294531 C99.3056979,133.335994 106.714387,133.071591 113.910723,132.501323 C122.409039,131.82788 131.283523,130.674607 140.534177,129.041504 Z M147.408726,73.8119663 C147.932139,72.4026903 149.508386,71.6634537 150.954581,72.149012 L150.954581,72.149012 L151.742552,72.4154854 C177.583763,81.217922 187.402356,90.8916805 181.198332,101.436761 C175.129904,111.751366 157.484347,119.260339 128.26166,123.963678 C127.613529,124.067994 126.948643,123.945969 126.382735,123.618843 C125.047025,122.846729 124.602046,121.158214 125.388848,119.847438 L125.388848,119.847438 L125.889328,119.0105 C129.877183,112.31633 133.481358,105.654262 136.701854,99.0242957 C140.50501,91.1948179 144.073967,82.7907081 147.408726,73.8119663 Z M61.7383398,66.0363218 C62.3864708,65.9320063 63.0513565,66.0540315 63.6172646,66.3811573 C64.9529754,67.153271 65.3979538,68.8417862 64.6111517,70.1525615 L64.6111517,70.1525615 L64.1106718,70.9895001 C60.1228168,77.6836699 56.5186416,84.3457379 53.2981462,90.9757043 C49.49499,98.8051821 45.9260332,107.209292 42.5912738,116.188034 C42.0678607,117.59731 40.4916143,118.336546 39.0454191,117.850988 L39.0454191,117.850988 L38.2574482,117.584515 C12.4162371,108.782078 2.59764379,99.1083195 8.80166785,88.5632391 C14.8700959,78.248634 32.5156533,70.7396613 61.7383398,66.0363218 Z"
                  fill="#FF2056"
                />
              </g>
            </g>
          </svg>
        </div>
        <div className="group relative flex aspect-square h-full w-full flex-col items-center justify-center gap-4 overflow-hidden border-l p-6 not-sm:border-r">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--muted) 0px, var(--muted) 1px, transparent 1px, transparent 5px)",
            }}
          />
          <h1 className="text-center text-2xl leading-tight font-semibold text-wrap lg:text-3xl">
            Cloudflare Workers
          </h1>
          <p className="text-center text-2xl leading-tight font-medium text-wrap lg:text-3xl">
            Serverless infrastructure for running your application at the edge
            worldwide
          </p>
          <svg
            viewBox="0 0 256 231"
            preserveAspectRatio="xMidYMid"
            className="absolute -bottom-20 size-40 grayscale transition-all group-hover:scale-105 group-hover:grayscale-0"
          >
            <defs>
              <linearGradient
                id="cloudflare_workers__a"
                x1="50%"
                x2="25.7%"
                y1="100%"
                y2="8.7%"
              >
                <stop offset="0%" stopColor="#EB6F07" />
                <stop offset="100%" stopColor="#FAB743" />
              </linearGradient>
              <linearGradient
                id="cloudflare_workers__b"
                x1="81%"
                x2="40.5%"
                y1="83.7%"
                y2="29.5%"
              >
                <stop offset="0%" stopColor="#D96504" />
                <stop offset="100%" stopColor="#D96504" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="cloudflare_workers__c"
                x1="42%"
                x2="84%"
                y1="8.7%"
                y2="79.9%"
              >
                <stop offset="0%" stopColor="#EB6F07" />
                <stop offset="100%" stopColor="#EB720A" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="cloudflare_workers__d"
                x1="50%"
                x2="25.7%"
                y1="100%"
                y2="8.7%"
              >
                <stop offset="0%" stopColor="#EE6F05" />
                <stop offset="100%" stopColor="#FAB743" />
              </linearGradient>
              <linearGradient
                id="cloudflare_workers__e"
                x1="-33.2%"
                x2="91.7%"
                y1="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#D96504" stopOpacity=".8" />
                <stop offset="49.8%" stopColor="#D96504" stopOpacity=".2" />
                <stop offset="100%" stopColor="#D96504" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="cloudflare_workers__f"
                x1="50%"
                x2="25.7%"
                y1="100%"
                y2="8.7%"
              >
                <stop offset="0%" stopColor="#FFA95F" />
                <stop offset="100%" stopColor="#FFEBC8" />
              </linearGradient>
              <linearGradient
                id="cloudflare_workers__g"
                x1="8.1%"
                x2="96.5%"
                y1="1.1%"
                y2="48.8%"
              >
                <stop offset="0%" stopColor="#FFF" stopOpacity=".5" />
                <stop offset="100%" stopColor="#FFF" stopOpacity=".1" />
              </linearGradient>
              <linearGradient
                id="cloudflare_workers__h"
                x1="-13.7%"
                x2="100%"
                y1="104.2%"
                y2="46.2%"
              >
                <stop offset="0%" stopColor="#FFF" stopOpacity=".5" />
                <stop offset="100%" stopColor="#FFF" stopOpacity=".1" />
              </linearGradient>
            </defs>
            <path
              fill="url(#cloudflare_workers__a)"
              d="m65.82 3.324 30.161 54.411-27.698 49.857a16.003 16.003 0 0 0 0 15.573l27.698 49.98-30.16 54.411a32.007 32.007 0 0 1-13.542-12.74L4.27 131.412a32.13 32.13 0 0 1 0-32.007l48.01-83.403a32.007 32.007 0 0 1 13.542-12.68Z"
            />
            <path
              fill="url(#cloudflare_workers__b)"
              d="M68.283 107.654a16.003 16.003 0 0 0 0 15.51l27.698 49.98-30.16 54.412a32.007 32.007 0 0 1-13.542-12.74L4.27 131.412c-3.816-6.586 17.542-14.465 64.014-23.698v-.061Z"
              opacity=".7"
            />
            <path
              fill="url(#cloudflare_workers__c)"
              d="m68.898 8.802 27.083 48.933-4.493 7.818-23.882-40.44c-6.894-11.264-17.42-5.416-30.591 17.358l1.97-3.386 13.294-23.082a32.007 32.007 0 0 1 13.419-12.68l3.139 5.479h.061Z"
              opacity=".5"
            />
            <path
              fill="url(#cloudflare_workers__d)"
              d="m203.696 16.003 48.01 83.403c5.725 9.848 5.725 22.159 0 32.007l-48.01 83.402a32.007 32.007 0 0 1-27.698 16.004h-48.01l59.705-107.654a16.003 16.003 0 0 0 0-15.511L127.988 0h48.01a32.007 32.007 0 0 1 27.698 16.003Z"
            />
            <path
              fill="url(#cloudflare_workers__e)"
              d="m173.536 230.45-47.395.43 57.367-108.208a16.619 16.619 0 0 0 0-15.634L126.14 0h10.834l60.197 106.546a16.619 16.619 0 0 1-.062 16.496 9616.838 9616.838 0 0 0-38.592 67.707c-11.695 20.558-6.648 33.791 15.018 39.7Z"
            />
            <path
              fill="url(#cloudflare_workers__f)"
              d="M79.978 230.819c-4.924 0-9.849-1.17-14.157-3.263l59.212-106.792a11.045 11.045 0 0 0 0-10.71L65.821 3.324A32.007 32.007 0 0 1 79.978 0h48.01l59.705 107.654a16.003 16.003 0 0 1 0 15.51L127.988 230.82h-48.01Z"
            />
            <path
              fill="url(#cloudflare_workers__g)"
              d="M183.508 110.054 122.448 0h5.54l59.705 107.654a16.003 16.003 0 0 1 0 15.51L127.988 230.82h-5.54l61.06-110.055a11.045 11.045 0 0 0 0-10.71Z"
              opacity=".6"
            />
            <path
              fill="url(#cloudflare_workers__h)"
              d="M125.033 110.054 65.821 3.324c1.846-.985 4.062-1.724 6.155-2.34 13.049 23.452 32.315 59.029 57.859 106.67a16.003 16.003 0 0 1 0 15.51L71.053 229.589c-2.093-.616-3.201-1.047-5.17-1.97l59.089-106.792a11.045 11.045 0 0 0 0-10.71l.061-.062Z"
              opacity=".6"
            />
          </svg>
        </div>
      </div>
      <div className="relative flex w-full flex-col items-start justify-center gap-4 border p-12 py-16">
        <div className="absolute inset-4 -z-10">
          <svg
            className="text-primary/10 pointer-events-none absolute inset-0"
            width="100%"
            height="100%"
          >
            <defs>
              <pattern
                id="dots-_S_2_"
                x={-1}
                y={-1}
                width={12}
                height={12}
                patternUnits="userSpaceOnUse"
              >
                <rect x={1} y={1} width={2} height={2} fill="currentColor" />
              </pattern>
            </defs>
            <rect fill="url(#dots-_S_2_)" width="100%" height="100%" />
          </svg>
        </div>
        <h1 className="text-2xl leading-tight font-semibold text-wrap lg:text-3xl">
          All-in-one.
        </h1>
        <p className="text-muted-foreground text-2xl leading-normal font-medium text-wrap sm:max-w-[80%] lg:text-3xl">
          Build with{" "}
          <a
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              fill="none"
              stroke="currentColor"
              strokeWidth={32}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary size-6"
              aria-hidden="true"
            >
              <line x1="208" y1="128" x2="128" y2="208" />
              <line x1="192" y1="40" x2="40" y2="192" />
            </svg>
            <span className="text-primary font-semibold">Shadcn</span>
          </a>{" "}
          components on{" "}
          <a
            href="https://base-ui.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="24"
              viewBox="0 0 17 24"
              fill="currentColor"
              className="text-primary size-6"
              aria-hidden="true"
            >
              <path d="M9.5001 7.01537C9.2245 6.99837 9 7.22385 9 7.49999V23C13.4183 23 17 19.4183 17 15C17 10.7497 13.6854 7.27351 9.5001 7.01537Z" />
              <path d="M8 9.8V12V23C3.58172 23 0 19.0601 0 14.2V12V1C4.41828 1 8 4.93989 8 9.8Z" />
            </svg>
            <span className="text-primary font-semibold">Base UI</span>
          </a>
          , authenticate users with{" "}
          <a
            href="https://www.better-auth.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <svg
              fill="none"
              viewBox="0 0 500 500"
              className="inline-block size-6"
            >
              <path fill="#fff" d="M0 0h500v500H0z" />
              <path
                fill="#000"
                d="M69 121h86.988v259H69zM337.575 121H430v259h-92.425z"
              />
              <path
                fill="#000"
                d="M427.282 121v83.456h-174.52V121zM430 296.544V380H252.762v-83.456z"
              />
              <path fill="#000" d="M252.762 204.455v92.089h-96.774v-92.089z" />
            </svg>
            <span className="text-primary font-semibold">Better-Auth</span>
          </a>
          , and monetize through{" "}
          <a
            href="https://stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:underline"
          >
            <span className="inline-flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                className="inline-block size-6 brightness-125"
                fill="#6772e5"
              >
                <path
                  d="M111.328 15.602c0-4.97-2.415-8.9-7.013-8.9s-7.423 3.924-7.423 8.863c0 5.85 3.32 8.8 8.036 8.8 2.318 0 4.06-.528 5.377-1.26V19.22a10.246 10.246 0 0 1-4.764 1.075c-1.9 0-3.556-.67-3.774-2.943h9.497a39.64 39.64 0 0 0 .063-1.748zm-9.606-1.835c0-2.186 1.35-3.1 2.56-3.1s2.454.906 2.454 3.1zM89.4 6.712a5.434 5.434 0 0 0-3.801 1.509l-.254-1.208h-4.27v22.64l4.85-1.032v-5.488a5.434 5.434 0 0 0 3.444 1.265c3.472 0 6.64-2.792 6.64-8.957.003-5.66-3.206-8.73-6.614-8.73zM88.23 20.1a2.898 2.898 0 0 1-2.288-.906l-.03-7.2a2.928 2.928 0 0 1 2.315-.96c1.775 0 2.998 2 2.998 4.528.003 2.593-1.198 4.546-2.995 4.546zM79.25.57l-4.87 1.035v3.95l4.87-1.032z"
                  fillRule="evenodd"
                />
                <path d="M74.38 7.035h4.87V24.04h-4.87z" />
                <path
                  d="M69.164 8.47l-.302-1.434h-4.196V24.04h4.848V12.5c1.147-1.5 3.082-1.208 3.698-1.017V7.038c-.646-.232-2.913-.658-4.048 1.43zm-9.73-5.646L54.698 3.83l-.02 15.562c0 2.87 2.158 4.993 5.038 4.993 1.585 0 2.756-.302 3.405-.643v-3.95c-.622.248-3.683 1.138-3.683-1.72v-6.9h3.683V7.035h-3.683zM46.3 11.97c0-.758.63-1.05 1.648-1.05a10.868 10.868 0 0 1 4.83 1.25V7.6a12.815 12.815 0 0 0-4.83-.888c-3.924 0-6.557 2.056-6.557 5.488 0 5.37 7.375 4.498 7.375 6.813 0 .906-.78 1.186-1.863 1.186-1.606 0-3.68-.664-5.307-1.55v4.63a13.461 13.461 0 0 0 5.307 1.117c4.033 0 6.813-1.992 6.813-5.485 0-5.796-7.417-4.76-7.417-6.943zM13.88 9.515c0-1.37 1.14-1.9 2.982-1.9A19.661 19.661 0 0 1 25.6 9.876v-8.27A23.184 23.184 0 0 0 16.862.001C9.762.001 5 3.72 5 9.93c0 9.716 13.342 8.138 13.342 12.326 0 1.638-1.4 2.146-3.37 2.146-2.905 0-6.657-1.202-9.6-2.802v8.378A24.353 24.353 0 0 0 14.973 32C22.27 32 27.3 28.395 27.3 22.077c0-10.486-13.42-8.613-13.42-12.56z"
                  fillRule="evenodd"
                />
              </svg>
              <span className="text-primary font-semibold">Stripe</span>
            </span>
          </a>
          .
        </p>
      </div>
      <div className="relative flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 overflow-hidden border border-t-0 p-6">
        <div className="absolute inset-0 isolate -z-10 overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-300 -translate-x-1/2 mask-[linear-gradient(black,transparent_320px),linear-gradient(90deg,transparent,black_5%,black_95%,transparent)] mask-intersect">
            <svg
              className="text-primary/10 pointer-events-none absolute inset-0"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern
                  id="grid-_r_17_"
                  x="-0.25"
                  y={-1}
                  width={60}
                  height={60}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 60 0 L 0 0 0 60"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={1}
                  />
                </pattern>
              </defs>
              <rect fill="url(#grid-_r_17_)" width="100%" height="100%" />
            </svg>
          </div>
          <div className="absolute top-6 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2 scale-x-[1.6] opacity-10 mix-blend-overlay">
            <div className="absolute -inset-16 bg-[conic-gradient(from_90deg,#22d3ee_5deg,#38bdf8_63deg,#2563eb_115deg,#0ea5e9_170deg,#22d3ee_220deg,#38bdf8_286deg,#22d3ee_360deg)] mix-blend-overlay blur-[50px] grayscale saturate-[2]" />
            <div className="absolute -inset-16 bg-[conic-gradient(from_90deg,#22d3ee_5deg,#38bdf8_63deg,#2563eb_115deg,#0ea5e9_170deg,#22d3ee_220deg,#38bdf8_286deg,#22d3ee_360deg)] mix-blend-overlay blur-[50px] grayscale saturate-[2]" />
          </div>
        </div>
        <span className="text-primary/90 flex h-8 items-center rounded-full text-sm font-medium">
          Open Source & Free
        </span>
        <h1 className="text-center text-3xl leading-tight font-semibold text-wrap md:text-5xl">
          Ready to build your next SaaS?
        </h1>
        <p className="text-muted-foreground max-w-xl text-center text-xl leading-relaxed md:text-2xl">
          Start your project in minutes, support us on GitHub and jump straight
          into the code.
        </p>
        <div className="mt-6 flex flex-col items-center gap-6">
          <div className="flex w-fit gap-4">
            <Button
              variant="outline"
              render={
                <a
                  href="https://github.com/mw10013/tanstack-cloudflare-saas"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="h-11 rounded-full! text-base! font-medium"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path d={siGithub.path} />
              </svg>
              Star on Github
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">MIT licensed.</p>
        </div>
      </div>
    </div>
  );
}
