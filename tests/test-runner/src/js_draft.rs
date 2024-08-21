#[cfg(test)]
use reqwest::StatusCode;

#[cfg(test)]
static URL_ADDRESS: &str = "http://127.0.0.1:9830";
#[cfg(test)]
static X_LAND_M: &str = "x-land-m";
#[cfg(test)]
static JS_DIR: &str = "tests/js-files-draft/";

#[tokio::test]
async fn js_9_1_wait_timeout() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/9-1-wait-timeout.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "Hello World!");
}
