import uvicorn


def main():
    uvicorn.run("baseline_mpm.http.api:api", host="0.0.0.0", port=4000, log_config="logging.yaml", reload=True)


if __name__ == "__main__":
    main()
