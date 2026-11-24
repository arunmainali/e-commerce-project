package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port             string
	Env              string
	DatabaseURL      string
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration
	CORSOrigins      string
	ShippingFlatRate int64
	BuyersPremiumPct int
	KhaltiSecretKey  string
	KhaltiPublicKey  string
	KhaltiBaseURL    string
	UploadDir        string
	MaxUploadSize    int64
	GA4MeasurementID string
	FrontendURL      string
}

func loadDotEnv() {
	paths := []string{".env", "../.env", "/app/.env", "./Backend/.env"}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				k := strings.TrimSpace(parts[0])
				v := strings.TrimSpace(parts[1])
				v = strings.Trim(v, `"'`)
				if os.Getenv(k) == "" {
					os.Setenv(k, v)
				}
			}
		}
		break
	}
}

func sanitizeURL(rawURL string) string {
	if !strings.Contains(rawURL, "://") {
		return rawURL
	}
	schemeParts := strings.SplitN(rawURL, "://", 2)
	scheme := schemeParts[0]
	rest := schemeParts[1]

	atIdx := strings.LastIndex(rest, "@")
	if atIdx == -1 {
		return rawURL
	}

	userInfo := rest[:atIdx]
	hostAndRest := rest[atIdx+1:]

	userParts := strings.SplitN(userInfo, ":", 2)
	if len(userParts) != 2 {
		return rawURL
	}

	user := userParts[0]
	pass := userParts[1]

	// URL-encode any raw spaces in password
	if strings.Contains(pass, " ") {
		pass = strings.ReplaceAll(pass, " ", "%20")
	}

	return fmt.Sprintf("%s://%s:%s@%s", scheme, user, pass, hostAndRest)
}

func resolveDatabaseURL() string {
	var rawURL string

	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		rawURL = dbURL
	} else if dsn := os.Getenv("DB_DSN"); dsn != "" {
		rawURL = dsn
	} else {
		user := os.Getenv("DB_USER")
		pass := os.Getenv("DB_PASSWORD")
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		name := os.Getenv("DB_NAME")

		if user != "" && host != "" && name != "" {
			if port == "" {
				port = "5432"
			}
			encodedPass := strings.ReplaceAll(pass, " ", "%20")
			rawURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, encodedPass, host, port, name)
		} else {
			rawURL = "postgres://postgres:parth%20grey1@localhost:5432/ecom_db?sslmode=disable"
		}
	}

	return sanitizeURL(rawURL)
}

func Load() *Config {
	loadDotEnv()
	return &Config{
		Port:             getEnv("PORT", "8080"),
		Env:              getEnv("ENV", "development"),
		DatabaseURL:      resolveDatabaseURL(),
		JWTSecret:        getEnv("JWT_SECRET", "dev-secret-change-me"),
		JWTAccessExpiry:  getDuration("JWT_ACCESS_EXPIRY", 15*time.Minute),
		JWTRefreshExpiry: getDuration("JWT_REFRESH_EXPIRY", 168*time.Hour),
		CORSOrigins:      getEnv("CORS_ORIGINS", "http://localhost:5173"),
		ShippingFlatRate: getEnvInt64("SHIPPING_FLAT_RATE", 500),
		BuyersPremiumPct: getEnvInt("BUYERS_PREMIUM_PCT", 10),
		KhaltiSecretKey:  getEnv("KHALTI_SECRET_KEY", "f71c9259c8f6457990893885d591abc7"),
		KhaltiPublicKey:  getEnv("KHALTI_PUBLIC_KEY", "bf89cb854d474508bf73337f6c273d88"),
		KhaltiBaseURL:    getEnv("KHALTI_BASE_URL", "https://a.khalti.com/api/v2"),
		UploadDir:        getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSize:    getEnvInt64("MAX_UPLOAD_SIZE", 10<<20),
		GA4MeasurementID: getEnv("GA4_MEASUREMENT_ID", ""),
		FrontendURL:      getEnv("FRONTEND_URL", "http://localhost:5173"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	s := os.Getenv(key)
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return v
}

func getEnvInt64(key string, fallback int64) int64 {
	s := os.Getenv(key)
	if s == "" {
		return fallback
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return fallback
	}
	return v
}

func getDuration(key string, fallback time.Duration) time.Duration {
	s := os.Getenv(key)
	if s == "" {
		return fallback
	}
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}
