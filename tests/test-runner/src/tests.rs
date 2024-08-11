#[cfg(test)]
use reqwest::StatusCode;

#[cfg(test)]
static URL_ADDRESS: &str = "http://127.0.0.1:9830";
#[cfg(test)]
static X_LAND_M: &str = "x-land-m";

#[tokio::test]
async fn js_1_hello() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, "tests/js-files/1-hello.js.wasm")
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "Hello World!");
}
