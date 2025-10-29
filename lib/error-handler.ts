type PromiseFactory<T> = () => Promise<T>;

type Awaitable<T> = Promise<T> | PromiseFactory<T>;

type GoSuccess<TData> = { data: TData; error: null };
type GoFailure<TError> = { data: null; error: TError };
type GoResult<TData, TError = unknown> = GoSuccess<TData> | GoFailure<TError>;

const isPromiseFactory = <T>(value: Awaitable<T>): value is PromiseFactory<T> =>
  typeof value === "function";

export async function go<TData, TError = unknown>(
  input: Awaitable<TData>
): Promise<GoResult<TData, TError>> {
  try {
    const promise = isPromiseFactory(input) ? input() : input;
    const data = await promise;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as TError };
  }
}

export function goSync<TData, TError = unknown>(
  input: () => TData
): GoResult<TData, TError> {
  try {
    const data = input();

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as TError };
  }
}
