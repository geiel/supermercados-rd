export default function ValueScorePage() {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-6">
            <div className="space-y-8">
                <div className="space-y-3">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                        Cómo se calcula el Índice de eficiencia
                    </h1>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        Este índice resume cobertura, precio y cantidad de tiendas para explicar
                        por que una selección se considera mejor valor. No tiene un tope fijo; el
                        número se redondea a un decimal (ejemplo: 34.3).
                    </p>
                </div>

                <section className="space-y-3">
                    <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        1) Normalizamos precios
                    </h2>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        Cada producto se convierte a un precio comparable. Si la unidad es de
                        peso o volumen usamos RD$ por 100 g o 100 ml. Si la unidad es por conteo,
                        usamos RD$ por unidad. Si no hay unidad clara, usamos el precio tal cual.
                        En productos agrupados, se usa la alternativa mas barata por tienda.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        2) Total por seleccion
                    </h2>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        Para una seleccion de tiendas, tomamos el mejor precio normalizado dentro
                        de esa seleccion para cada producto y lo multiplicamos por la cantidad del
                        listado. Si un producto no tiene precio en esa seleccion, cuenta como
                        faltante.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        3) Promedio por producto
                    </h2>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        Calculamos el precio promedio por producto disponible. Esto evita que una
                        lista grande dispare el índice, porque trabajamos en base al promedio y no
                        al total bruto. Luego multiplicamos por 1000 para mantener el número en un
                        rango fácil de leer.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        4) Cobertura y cantidad de tiendas
                    </h2>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        El índice baja si faltan productos, y sube si seleccionas más tiendas. El
                        factor de tiendas es tiendas seleccionadas dividido entre el total de
                        tiendas disponibles. Esto hace que, la mayoría de las veces, ir a más
                        supermercados produzca un valor más alto.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        ¿Por qué puede costar más y aun así ser mejor?
                    </h2>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        El total puede subir porque una selección cubre más productos o porque
                        eliges más tiendas. Aun así, si el promedio por producto se mantiene bajo
                        y la cobertura es mejor, el índice puede subir. En otras palabras, no solo
                        miramos el precio total, sino cuanto pagas en promedio por lo que
                        realmente consigues.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        Ejemplo rapido
                    </h2>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        Si hay 10 productos, cubres 9 y el promedio de precio por producto es
                        RD$30, con 2 tiendas de 6 disponibles. El factor de cobertura es 9/10 y
                        el factor de tiendas es 2/6. El índice queda cerca de
                        (9/10 * 2/6 * 1000) / 30 = 10.0.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        Resultado final
                    </h2>
                    <p className="leading-7 text-muted-foreground [&:not(:first-child)]:mt-6">
                        La mejor tienda o pareja es la que obtiene el índice más alto dentro de su
                        cantidad de tiendas. El cálculo no tiene un tope fijo; la escala se
                        mantiene estable porque se usa el promedio por producto.
                    </p>
                </section>
            </div>
        </div>
    );
}
