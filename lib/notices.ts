type SearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> | undefined;

export async function transactionNotice(searchParams: SearchParams) {
  const params = await searchParams;
  return params?.error === "transaction" ? "Transaction not completed" : undefined;
}
